// Scores the stored claim-check cases through today's Haiku and Sonnet prompts and through the Decider, and keeps each request body.
// Usage: bun tools/decider-claim-check.ts <cases.jsonl> <payload-folder> --summary <file.md> --prices <file.json> --max-usd <n>
//   [--anthropic-base-url <url>] [--typesafe-base-url <url>]
// `ANTHROPIC_API_KEY` is read from the environment. `TYPESAFE_API_KEY` is read through Bun's `.env` loading. Neither is printed or written.
// `--prices` is JSON of USD per million tokens: {"claude-haiku-5-5": {"input", "output", "cacheRead", "cacheWrite"}, "claude-sonnet-5-5": {...}},
// copied from the Anthropic pricing page (https://platform.claude.com/docs/en/about-claude/pricing).
import { parseArgs } from "node:util";

import { env, file, write } from "bun";

import {
	CLAIM_CHECK,
	type ClaimFault,
	claimState,
	faultsOf,
	noulsFor,
} from "../plugins/claudetto/hooks/decider/claim-check.ts";
import type { QuestionSet } from "../plugins/claudetto/hooks/decider/questions.ts";
import { settle } from "../plugins/claudetto/hooks/decider/settle.ts";
import {
	type Graded,
	gradeOnce,
	UNSEEN_PEERS,
} from "../plugins/claudetto/hooks/limits/grade.ts";
import {
	GRADE_FAULTS,
	type GradeFault,
} from "../plugins/claudetto/hooks/texts-grade.ts";
import { type Ctx, host, JEV_ORIGIN, newCtx } from "./claim-check-client.ts";
import { fail, field, readPrices } from "./claim-check-prices.ts";
import {
	finalLine,
	type Findings,
	type Row,
	summary,
} from "./claim-check-report.ts";

type Roads = Findings["roads"];

const isFault = (code: unknown): code is GradeFault =>
	typeof code === "string" && Object.hasOwn(GRADE_FAULTS, code);

const strings = (value: unknown): string[] =>
	Array.isArray(value) && value.every((item) => typeof item === "string")
		? value
		: fail("A case field is not a list of strings.");

const asCase = (line: string) => {
	const raw: unknown = JSON.parse(line);
	const input = field(raw, "input");
	const turn = {
		user: String(field(input, "user")),
		people: strings(field(input, "people")),
		shown: strings(field(input, "shown")),
		results: strings(field(input, "results")),
		failed: String(field(input, "failed")),
		looked: false,
	};
	return {
		id: String(field(raw, "id")),
		expected: strings(field(raw, "expected")),
		turn,
		reply: String(field(input, "reply")),
		tasks: strings(field(input, "tasks")),
		codes: strings(field(input, "codes")).filter((code) => isFault(code)),
	};
};

type Case = ReturnType<typeof asCase>;

const gradeRoad = (ctx: Ctx, c: Case, model: "haiku" | "sonnet") => {
	ctx.label = model;
	ctx.sent = 0;
	const graded: Graded = { turn: c.turn, reply: c.reply, tasks: c.tasks };
	if (model === "haiku") {
		const list = c.codes.filter((code) => code !== "unseen");
		return gradeOnce(host(ctx), graded, { model, list, results: [] });
	}
	return gradeOnce(host(ctx), graded, {
		model,
		list: [...UNSEEN_PEERS, "unseen"],
		results: c.turn.results,
		keep: ["credited", "unseen"],
	});
};

const subset = (names: readonly string[]): QuestionSet => ({
	...CLAIM_CHECK,
	questions: Object.fromEntries(
		Object.entries(CLAIM_CHECK.questions).filter(([name]) =>
			names.includes(name),
		),
	),
});

const deciderRoad = async (ctx: Ctx, c: Case): Promise<ClaimFault[]> => {
	ctx.label = "decider-fallback";
	ctx.sent = 0;
	const answers = await settle(
		host(ctx),
		subset(noulsFor(c.codes)),
		claimState({ ...c.turn, reply: c.reply, tasks: c.tasks }),
	);
	return faultsOf(c.codes, answers);
};

const ALL = Object.keys(GRADE_FAULTS);
const emptyRoads = (): Roads =>
	new Map([
		["haiku", { scope: ALL.filter((code) => code !== "unseen"), rows: [] }],
		["sonnet", { scope: ["credited", "unseen"], rows: [] }],
		["today", { scope: ALL, rows: [] }],
		["decider", { scope: ALL, rows: [] }],
	]);

const add = (into: Roads, name: string, row: Row): void => {
	into.get(name)?.rows.push(row);
};

const scoreCase = async (
	ctx: Ctx,
	c: Case,
	into: Roads,
	unread: { n: number },
): Promise<void> => {
	ctx.caseId = c.id;
	const lost = (): GradeFault[] => {
		unread.n += 1;
		return [];
	};
	const haiku = await gradeRoad(ctx, c, "haiku").catch(lost);
	const withTools = c.turn.results.length > 0;
	const sonnet = withTools ? await gradeRoad(ctx, c, "sonnet").catch(lost) : [];
	const decider = await deciderRoad(ctx, c);
	if (ctx.stopped) {
		return;
	}
	const row = (found: readonly string[]): Row => ({
		id: c.id,
		expected: c.expected,
		found,
	});
	add(into, "haiku", row(haiku));
	if (withTools) {
		add(into, "sonnet", row(sonnet));
	}
	add(into, "today", row([...haiku, ...sonnet]));
	add(into, "decider", row(decider));
};

const keyOf = (name: string, where: string): string =>
	env[name] ?? fail(`${name} is not set. ${where}`);

const OPTIONS = {
	summary: { type: "string" },
	prices: { type: "string" },
	"max-usd": { type: "string" },
	"anthropic-base-url": {
		type: "string",
		default: "https://api.anthropic.com",
	},
	"typesafe-base-url": { type: "string", default: JEV_ORIGIN },
} as const;

const context = async () => {
	const { values, positionals } = parseArgs({
		allowPositionals: true,
		options: OPTIONS,
	});
	const [casesPath, outDir] = positionals;
	const maxUsd = Number(values["max-usd"]);
	const { summary: summaryPath, prices } = values;
	if (
		casesPath === undefined ||
		outDir === undefined ||
		summaryPath === undefined ||
		prices === undefined ||
		!(maxUsd > 0)
	) {
		return fail(
			"Usage: decider-claim-check.ts <cases.jsonl> <payload-folder> --summary <file.md> --prices <file.json> --max-usd <n>",
		);
	}
	const ctx = newCtx({
		anthropicUrl: values["anthropic-base-url"],
		typesafeUrl: values["typesafe-base-url"],
		anthropicKey: keyOf(
			"ANTHROPIC_API_KEY",
			"Export it in the shell that runs this tool.",
		),
		typesafeKey: keyOf(
			"TYPESAFE_API_KEY",
			"Set it in the shell or in a .env file Bun loads.",
		),
		prices: await readPrices(prices),
		maxUsd,
		outDir,
	});
	return { ctx, casesPath, summaryPath };
};

// One case at a time, so each request is checked against the cap before it is sent.
const scoreAll = async (
	ctx: Ctx,
	cases: readonly Case[],
	into: Roads,
	unread: { n: number },
): Promise<void> => {
	const [c, ...rest] = cases;
	if (c === undefined || ctx.stopped) {
		return;
	}
	await scoreCase(ctx, c, into, unread);
	await scoreAll(ctx, rest, into, unread);
};

const main = async (): Promise<number> => {
	const { ctx, casesPath, summaryPath } = await context();
	const text = await file(casesPath).text();
	const cases = text
		.trim()
		.split("\n")
		.map((line) => asCase(line));
	const roads = emptyRoads();
	const unread = { n: 0 };
	await scoreAll(ctx, cases, roads, unread);
	const findings: Findings = {
		roads,
		calls: ctx.calls,
		jev: ctx.jev,
		usd: ctx.usd,
		stopped: ctx.stopped,
		unread: unread.n,
		logLines: ctx.logLines,
	};
	await write(summaryPath, summary(findings));
	console.info(finalLine(findings));
	return ctx.stopped ? 2 : 0;
};

process.exitCode = await main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : String(error));
	return 1;
});
