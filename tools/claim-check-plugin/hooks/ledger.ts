// Scores the stored ledger cases through the ledger's own `readLedger`, on the engine's `$`. The engine loads this module, so it uses no Bun or node API.
import { RULE_CRITERIA } from "../../../plugins/claudetto/hooks/decider/questions.ts";
import {
	readLedger,
	sentencesOf,
} from "../../../plugins/claudetto/hooks/pin-ledger.ts";
import type { PinConstraint } from "../../../plugins/claudetto/hooks/texts-handoff.ts";
import { field, lines } from "../../claim-check-prices.ts";
import { matches, type Row } from "../../claim-check-report.ts";
import { type Ctx, eachCase, type Engine, host } from "./client.ts";
import type { Scored } from "./scored.ts";

const isRule = (value: unknown): value is keyof typeof RULE_CRITERIA =>
	typeof value === "string" && Object.hasOwn(RULE_CRITERIA, value);

const entry = (item: unknown): PinConstraint => {
	const rule = field(item, "rule");
	return {
		text: String(field(item, "text")),
		rule: isRule(rule) ? rule : "none",
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
		previous: list(field(input, "previous")),
		now: String(field(input, "now")),
		expected: list(field(expected, "entries")),
	};
};

type Case = ReturnType<typeof asCase>;

/** The codes of an outcome: each entry as its rule and the person's words. */
const codesOf = (entries: readonly PinConstraint[]): string[] =>
	entries.map(
		(e) =>
			`entry:${e.rule}:${e.text.toLowerCase().replaceAll(/\s+/gu, " ").trim()}`,
	);

interface Measured {
	readonly sentences: number;
	readonly chars: number;
	readonly exact: boolean;
	readonly refused: number;
}

async function scoreCase(
	$: Engine,
	ctx: Ctx,
	c: Case,
	rows: Row[],
	measured: Measured[],
): Promise<void> {
	ctx.caseId = c.id;
	ctx.label = "decider-fallback";
	ctx.sent = 0;
	const refusedBefore = ctx.jev.refused;
	const ledger = await readLedger(host($, ctx), [], c.now, c.previous);
	if (ctx.stopped) {
		return;
	}
	const row: Row = {
		id: c.id,
		expected: codesOf(c.expected),
		found: codesOf(ledger),
	};
	rows.push(row);
	measured.push({
		sentences: sentencesOf(c.now).length,
		chars: c.now.length,
		exact: matches(undefined, row),
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
	"| bin | cases | exact | Jev requests refused |",
	"| --- | --- | --- | --- |",
	...bins.map(([name, low, high]) => {
		const inBin = measured.filter((m) => value(m) >= low && value(m) <= high);
		return `| ${name} | ${inBin.length} | ${inBin.filter((m) => m.exact).length} | ${inBin.reduce((sum, m) => sum + m.refused, 0)} |`;
	}),
	"",
];

/** Scores each ledger case through the ledger's `readLedger`. A case's entries compare on rule and the person's words; `files` is not scored. */
export async function scoreLedger(
	$: Engine,
	ctx: Ctx,
	text: string,
): Promise<Scored> {
	const rows: Row[] = [];
	const measured: Measured[] = [];
	await eachCase(
		ctx,
		lines(text).map((line) => asCase(line)),
		(c) => scoreCase($, ctx, c, rows, measured),
	);
	const most = Math.max(0, ...measured.map((m) => m.sentences));
	return {
		title: "Ledger Run",
		roads: new Map([["decider", { scope: undefined, rows }]]),
		extra: [
			`Most sentences in one message: ${most}. Sentences per message: ${measured
				.map((m) => m.sentences)
				.toSorted((a, b) => a - b)
				.join(", ")}.`,
			"",
			...binTable(
				"Sentences per Message",
				BY_SENTENCES,
				measured,
				(m) => m.sentences,
			),
			...binTable(
				"Message Length in Characters",
				BY_CHARS,
				measured,
				(m) => m.chars,
			),
		],
	};
}
