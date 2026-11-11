// Scores the stored ledger cases through today's extraction (`pin.ts`) and through the Decider's per-sentence questions, on the engine's `$`. The engine loads this module, so it uses no Bun or node API.
import type { State } from "../../../plugins/claudetto/hooks/decider/questions.ts";
import { settle } from "../../../plugins/claudetto/hooks/decider/settle.ts";
import {
	extractFrom,
	type Extraction,
	isRule,
} from "../../../plugins/claudetto/hooks/pin.ts";
import type { PinConstraint } from "../../../plugins/claudetto/hooks/texts-handoff.ts";
import { field, lines, strings } from "../../claim-check-prices.ts";
import { type Findings, matches, type Row } from "../../claim-check-report.ts";
import { type Ctx, eachCase, type Engine, host } from "./client.ts";
import {
	isKind,
	questionsOf,
	type Rule,
	RULE_CRITERIA,
} from "./ledger-questions.ts";
import type { Scored } from "./scored.ts";

const SEGMENTER = new Intl.Segmenter("en", { granularity: "sentence" });

/** The sentences of a message, split with `Intl.Segmenter`. */
const sentencesOf = (message: string): string[] =>
	[...SEGMENTER.segment(message)]
		.map((part) => part.segment.trim())
		.filter((sentence) => sentence !== "");

const numbered = (items: readonly string[]): string =>
	items.map((item, i) => `${i + 1}. ${item}`).join("\n");

const flat = (text: string): string =>
	text.toLowerCase().replaceAll(/\s+/gu, " ").trim();

const entry = (item: unknown): PinConstraint => {
	const rule = field(item, "rule");
	return {
		text: String(field(item, "text")),
		rule: isRule(rule) ? rule : "none",
		quote: String(field(item, "quote") ?? field(item, "text")),
	};
};

const list = (value: unknown): PinConstraint[] =>
	Array.isArray(value) ? value.map((item) => entry(item)) : [];

const asCase = (line: string) => {
	const raw: unknown = JSON.parse(line);
	const input = field(raw, "input");
	const expected = field(raw, "expected");
	return {
		id: String(field(raw, "id")),
		history: strings(field(input, "history")),
		previous: list(field(input, "previous")),
		now: String(field(input, "now")),
		expected: {
			kind: String(field(expected, "kind")),
			entries: list(field(expected, "entries")),
		},
	};
};

type Case = ReturnType<typeof asCase>;

/** The codes of an outcome: its kind, and each entry as its rule and the person's words. An entry whose text or quote is an expected sentence takes that sentence's identity, so today's paraphrase is not charged for wording. */
const codesOf = (
	kind: string,
	entries: readonly PinConstraint[],
	said: readonly string[],
): string[] => [
	`kind:${kind}`,
	...entries.map((e) => {
		const own = [flat(e.text), flat(e.quote)].find((t) => said.includes(t));
		return `entry:${e.rule}:${own ?? flat(e.text)}`;
	}),
];

const todayOutcome = (found: Extraction | undefined, c: Case) =>
	found === undefined
		? { kind: "task", entries: c.previous }
		: { kind: found.kind, entries: found.constraints };

async function deciderOutcome(
	$: Engine,
	ctx: Ctx,
	c: Case,
	sentences: string[],
) {
	ctx.label = "decider-fallback";
	ctx.sent = 0;
	const state: State = {
		message: c.now,
		sentences: numbered(sentences),
		...(c.previous.length === 0
			? {}
			: { entries: numbered(c.previous.map((p) => p.text)) }),
	};
	const answers = await settle(
		host($, ctx),
		questionsOf(sentences.length, c.previous.length),
		state,
	);
	const rule = (i: number): Rule => {
		const picked = answers[`rule_${i + 1}`] ?? "";
		return Object.hasOwn(RULE_CRITERIA, picked) && isRule(picked)
			? picked
			: "none";
	};
	const kind = answers["kind"];
	return {
		kind: isKind(kind) ? kind : "task",
		entries: [
			...c.previous.filter((_, j) => answers[`lifts_${j + 1}`] !== "yes"),
			...sentences.flatMap((text, i) =>
				answers[`restricts_${i + 1}`] === "yes"
					? [{ text, rule: rule(i), quote: text }]
					: [],
			),
		],
	};
}

interface Measured {
	readonly sentences: number;
	readonly chars: number;
	readonly today: boolean;
	readonly decider: boolean;
	readonly refused: number;
}

async function scoreCase(
	$: Engine,
	ctx: Ctx,
	c: Case,
	roads: Findings["roads"],
	measured: Measured[],
	unread: { n: number },
): Promise<void> {
	ctx.caseId = c.id;
	ctx.label = "today";
	ctx.sent = 0;
	const found = await extractFrom(host($, ctx), c.history, c.previous, c.now);
	if (found === undefined) {
		unread.n += 1;
	}
	const sentences = sentencesOf(c.now);
	const refusedBefore = ctx.jev.refused;
	const decider = await deciderOutcome($, ctx, c, sentences);
	if (ctx.stopped) {
		return;
	}
	const said = c.expected.entries.map((e) => flat(e.text));
	const row = (outcome: {
		kind: string;
		entries: readonly PinConstraint[];
	}): Row => ({
		id: c.id,
		expected: codesOf(c.expected.kind, c.expected.entries, said),
		found: codesOf(outcome.kind, outcome.entries, said),
	});
	const today = row(todayOutcome(found, c));
	const mine = row(decider);
	roads.get("today")?.rows.push(today);
	roads.get("decider")?.rows.push(mine);
	measured.push({
		sentences: sentences.length,
		chars: c.now.length,
		today: matches(undefined, today),
		decider: matches(undefined, mine),
		refused: ctx.jev.refused - refusedBefore,
	});
}

const BY_SENTENCES: readonly [string, number, number][] = [
	["1", 1, 1],
	["2-3", 2, 3],
	["4-7", 4, 7],
	["8-15", 8, 15],
	["16-31", 16, 31],
	["32 or more", 32, Number.POSITIVE_INFINITY],
];

const BY_CHARS: readonly [string, number, number][] = [
	["up to 200", 0, 200],
	["201-1000", 201, 1000],
	["1001-5000", 1001, 5000],
	["over 5000", 5001, Number.POSITIVE_INFINITY],
];

const binTable = (
	heading: string,
	bins: readonly [string, number, number][],
	measured: readonly Measured[],
	value: (m: Measured) => number,
): string[] => [
	`## Score by ${heading}`,
	"",
	"| bin | cases | today exact | decider exact | Jev requests refused |",
	"|---|---|---|---|---|",
	...bins.map(([name, low, high]) => {
		const inBin = measured.filter((m) => value(m) >= low && value(m) <= high);
		const count = (pick: (m: Measured) => boolean) =>
			inBin.filter((m) => pick(m)).length;
		return `| ${name} | ${inBin.length} | ${count((m) => m.today)} | ${count((m) => m.decider)} | ${inBin.reduce((sum, m) => sum + m.refused, 0)} |`;
	}),
	"",
];

/** Scores each ledger case through today's extraction and through the Decider's per-sentence questions. A case's entries compare on rule and the person's words; `files` is not scored. */
export async function scoreLedger(
	$: Engine,
	ctx: Ctx,
	text: string,
): Promise<Scored> {
	const roads: Findings["roads"] = new Map([
		["today", { scope: undefined, rows: [] }],
		["decider", { scope: undefined, rows: [] }],
	]);
	const measured: Measured[] = [];
	const unread = { n: 0 };
	await eachCase(
		ctx,
		lines(text).map((line) => asCase(line)),
		(c) => scoreCase($, ctx, c, roads, measured, unread),
	);
	const most = Math.max(0, ...measured.map((m) => m.sentences));
	return {
		title: "Ledger run",
		roads,
		unread: unread.n,
		extra: [
			`Most sentences in one message: ${most}. Sentences per message: ${measured
				.map((m) => m.sentences)
				.toSorted((a, b) => a - b)
				.join(", ")}.`,
			"",
			...binTable(
				"sentences per message",
				BY_SENTENCES,
				measured,
				(m) => m.sentences,
			),
			...binTable(
				"message length in characters",
				BY_CHARS,
				measured,
				(m) => m.chars,
			),
		],
	};
}
