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
import { field, lines, strings } from "../../claim-check-prices.ts";
import type { Findings, Row } from "../../claim-check-report.ts";
import { type Ctx, eachCase, type Engine, host } from "./client.ts";
import type { Scored } from "./scored.ts";

type Roads = Findings["roads"];

const isFault = (code: unknown): code is GradeFault =>
	typeof code === "string" && Object.hasOwn(GRADE_FAULTS, code);

/** The case a JSONL line holds. */
export const asCase = (line: string) => {
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

/** Every fault the claim check can name. */
export const ALL = Object.keys(GRADE_FAULTS);
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

/** Scores each claim-check case through today's Haiku and Sonnet prompts and through the Decider. */
export async function scoreClaimCheck(
	$: Engine,
	ctx: Ctx,
	text: string,
): Promise<Scored> {
	const roads = emptyRoads();
	const unread = { n: 0 };
	await eachCase(
		ctx,
		lines(text).map((line) => asCase(line)),
		(c) => scoreCase($, ctx, c, roads, unread),
	);
	return { title: "Claim-Check Run", roads, unread: unread.n, extra: [] };
}
