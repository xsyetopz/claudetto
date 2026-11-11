// Scores the stored claim-check cases through today's Haiku and Sonnet prompts and through the Decider, on the engine's `$`. The engine loads this module, so it uses no Bun or node API.
import {
	CLAIM_CHECK,
	type ClaimFault,
	claimState,
	faultsOf,
	noulsFor,
} from "../../../plugins/claudetto/hooks/decider/claim-check.ts";
import type { QuestionSet } from "../../../plugins/claudetto/hooks/decider/questions.ts";
import { settle } from "../../../plugins/claudetto/hooks/decider/settle.ts";
import {
	type Graded,
	gradeOnce,
	UNSEEN_PEERS,
} from "../../../plugins/claudetto/hooks/limits/grade.ts";
import {
	GRADE_FAULTS,
	type GradeFault,
} from "../../../plugins/claudetto/hooks/texts-grade.ts";
import {
	fail,
	field,
	numberOf,
	type Price,
	pricesOf,
} from "../../claim-check-prices.ts";
import {
	finalLine,
	type Findings,
	type Row,
	summary,
} from "../../claim-check-report.ts";
import { type Ctx, type Engine, host, newCtx } from "./client.ts";

type Roads = Findings["roads"];

/** What the entry hands the hook: the cases, the prices, the cap, and where each file goes. */
export interface Job {
	readonly cases: string;
	readonly prices: Readonly<Record<string, Price>>;
	readonly maxUsd: number;
	readonly typesafeUrl: string;
	readonly outDir: string;
	readonly summaryPath: string;
	readonly finalPath: string;
}

/** The job a file holds. */
export function jobOf(text: string): Job {
	const raw: unknown = JSON.parse(text);
	return {
		cases: String(field(raw, "cases")),
		prices: pricesOf(field(raw, "prices"), "The job"),
		maxUsd: numberOf(field(raw, "maxUsd")),
		typesafeUrl: String(field(raw, "typesafeUrl")),
		outDir: String(field(raw, "outDir")),
		summaryPath: String(field(raw, "summaryPath")),
		finalPath: String(field(raw, "finalPath")),
	};
}

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

function gradeRoad($: Engine, ctx: Ctx, c: Case, model: "haiku" | "sonnet") {
	ctx.label = model;
	ctx.sent = 0;
	const graded: Graded = { turn: c.turn, reply: c.reply, tasks: c.tasks };
	if (model === "haiku") {
		const list = c.codes.filter((code) => code !== "unseen");
		return gradeOnce(host($, ctx), graded, { model, list, results: [] });
	}
	return gradeOnce(host($, ctx), graded, {
		model,
		list: [...UNSEEN_PEERS, "unseen"],
		results: c.turn.results,
		keep: ["credited", "unseen"],
	});
}

const subset = (names: readonly string[]): QuestionSet => ({
	...CLAIM_CHECK,
	questions: Object.fromEntries(
		Object.entries(CLAIM_CHECK.questions).filter(([name]) =>
			names.includes(name),
		),
	),
});

async function deciderRoad(
	$: Engine,
	ctx: Ctx,
	c: Case,
): Promise<ClaimFault[]> {
	ctx.label = "decider-fallback";
	ctx.sent = 0;
	const answers = await settle(
		host($, ctx),
		subset(noulsFor(c.codes)),
		claimState({ ...c.turn, reply: c.reply, tasks: c.tasks }),
	);
	return faultsOf(c.codes, answers);
}

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

async function scoreCase(
	$: Engine,
	ctx: Ctx,
	c: Case,
	into: Roads,
	unread: { n: number },
): Promise<void> {
	ctx.caseId = c.id;
	const lost = (): GradeFault[] => {
		unread.n += 1;
		return [];
	};
	const haiku = await gradeRoad($, ctx, c, "haiku").catch(lost);
	const withTools = c.turn.results.length > 0;
	const sonnet = withTools
		? await gradeRoad($, ctx, c, "sonnet").catch(lost)
		: [];
	const decider = await deciderRoad($, ctx, c);
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
}

// One case at a time, so each request is checked against the cap before it is sent.
async function scoreAll(
	$: Engine,
	ctx: Ctx,
	cases: readonly Case[],
	into: Roads,
	unread: { n: number },
): Promise<void> {
	const [c, ...rest] = cases;
	if (c === undefined || ctx.stopped) {
		return;
	}
	await scoreCase($, ctx, c, into, unread);
	await scoreAll($, ctx, rest, into, unread);
}

/** Scores every case of the job, writes the summary and the final-line file, and returns. */
export async function runJob($: Engine, job: Job): Promise<void> {
	const ctx = newCtx(job);
	const cases = job.cases
		.trim()
		.split("\n")
		.map((line) => asCase(line));
	const roads = emptyRoads();
	const unread = { n: 0 };
	await scoreAll($, ctx, cases, roads, unread);
	const findings: Findings = {
		roads,
		calls: ctx.calls,
		jev: ctx.jev,
		tokens: ctx.tokens,
		usd: ctx.usd,
		stopped: ctx.stopped,
		unread: unread.n,
		logLines: ctx.logLines,
	};
	await $.fs.write(job.summaryPath, summary(findings));
	await $.fs.write(
		job.finalPath,
		JSON.stringify({ line: finalLine(findings), code: ctx.stopped ? 2 : 0 }),
	);
}
