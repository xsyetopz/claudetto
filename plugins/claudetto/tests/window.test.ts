import type { On, SessionMessage } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";
import {
	rowsOf as parseRows,
	ROWS_KEY,
	TURNS_KEY,
	USD_KEY,
} from "../src/blocks/window/window.ts";

const WINDOW = 200_000;

/** The engine skips a `session.compact` whose `messages` is empty. */
const TO_COMPACT: readonly SessionMessage[] = [
	{ role: "user", text: "Build the export.", toolUses: [], handle: "h0" },
];

const measure = (fiveHour: number, tokens: number, usd: number) => ({
	context: { tokens, window: WINDOW, percent: (tokens / WINDOW) * 100 },
	rateLimits: [
		{ kind: "five_hour", percentUsed: fiveHour, resetsAt: "2026-10-29T12:00" },
	],
	cost: { usd },
	changed: ["rateLimits" as const],
});

const kept = new Map<string, unknown>();

const lab = (on: On): void => {
	kept.clear();
	mock.clock(on, { now: 1000 });
	on("store.get", (_$, e) => ({ value: kept.get(e.key) }));
	on("store.set", (_$, e) => {
		kept.set(e.key, e.value);
		return { value: undefined };
	});
	on("session.measure", (_$, e) => ({ changed: e.changed }));
	on("turn.start", (_$, e) => ({ turnId: e.turnId }));
	on("turn.complete", () => ({ text: "" }));
};

/** A lab with the turn `t1` started. */
const begin = async ($: Engine, on: On): Promise<void> => {
	lab(on);
	await $.turn.start({ text: "go", turnId: "t1" });
};

const rowsOf = () => kept.get(ROWS_KEY);

const turnsOf = () => kept.get(TURNS_KEY);

const done = {
	answer: "",
	durationMs: 1,
	isAborted: false,
	reason: "answer",
} as const;

test("a point the window moved leaves one row with the points and the token counts", async ($: Engine, on: On) => {
	await begin($, on);
	await $.session.measure(measure(10, 40_000, 0.1));

	await $.session.measure(measure(11, 52_000, 0.25));

	expect(rowsOf()).toMatchObject([
		{ source: "main", task: "t1", points: 1, tokens: 52_000, window: WINDOW },
	]);
});

test("the first reading only sets the baseline", async ($: Engine, on: On) => {
	await begin($, on);

	await $.session.measure(measure(10, 40_000, 0.1));

	expect(rowsOf()).toBeUndefined();
});

test("a subagent turn is tagged subagent and a main turn after it is tagged main", async ($: Engine, on: On) => {
	await begin($, on);
	await $.session.measure(measure(10, 40_000, 0.1));
	await $.turn.start({ text: "dig", turnId: "t2", agentId: "a1" });
	await $.session.measure(measure(12, 50_000, 0.2));
	await $.turn.complete({
		answer: "",
		durationMs: 1,
		isAborted: false,
		turnId: "t2",
		agentId: "a1",
		reason: "answer",
	});

	await $.session.measure(measure(13, 60_000, 0.3));

	expect(rowsOf()).toMatchObject([
		{ source: "subagent", task: "t1", points: 2 },
		{ source: "main", task: "t1", points: 1 },
	]);
});

test("a login with no rate-limit windows writes no row and keeps the cost in dollars", async ($: Engine, on: On) => {
	await begin($, on);

	await $.session.measure({
		context: { tokens: 30_000, window: WINDOW },
		rateLimits: [],
		cost: { usd: 0.42 },
		changed: ["cost"],
	});

	expect(rowsOf()).toBeUndefined();
	expect(kept.get(USD_KEY)).toBe(0.42);
});

test("a window that reset between two readings leaves no row", async ($: Engine, on: On) => {
	await begin($, on);
	await $.session.measure(measure(90, 40_000, 0.1));

	await $.session.measure({
		...measure(3, 50_000, 0.2),
		rateLimits: [
			{ kind: "five_hour", percentUsed: 3, resetsAt: "2026-10-29T17:00" },
		],
	});

	expect(rowsOf()).toBeUndefined();
});

test("the four counts and the model of a completed turn reach the store with the tag", async ($: Engine, on: On) => {
	await begin($, on);

	await $.turn.complete({
		...done,
		turnId: "t1",
		usage: {
			model: "m1",
			input_tokens: 10,
			output_tokens: 20,
			cache_read_input_tokens: 300,
			cache_creation_input_tokens: 4000,
		},
	});

	expect(turnsOf()).toMatchObject([
		{
			turn: "t1",
			task: "t1",
			source: "main",
			model: "m1",
			inputTokens: 10,
			outputTokens: 20,
			cacheReadTokens: 300,
			cacheWriteTokens: 4000,
		},
	]);
});

test("the first row after a compaction is marked and the rows before it are not", async ($: Engine, on: On) => {
	on("session.compact", () => ({ skip: "core ran" }));
	await begin($, on);
	await $.session.measure(measure(10, 140_000, 0.1));
	await $.session.measure(measure(11, 150_000, 0.2));

	await $.session.compact({ trigger: "auto", messages: [...TO_COMPACT] });
	await $.session.measure(measure(12, 20_000, 0.3));
	await $.session.measure(measure(13, 24_000, 0.4));

	// The mark says which pair of rows the compaction's fall is read from.
	expect(rowsOf()).toMatchObject([
		{ tokens: 150_000 },
		{ tokens: 20_000, afterCompaction: true },
		{ tokens: 24_000 },
	]);
	const marked = parseRows(kept.get(ROWS_KEY)).filter(
		(row) => row.afterCompaction === true,
	);
	expect(marked).toHaveLength(1);
});

test("a measurement that spans a window reset keeps the mark for the next row", async ($: Engine, on: On) => {
	on("session.compact", () => ({ skip: "core ran" }));
	await begin($, on);
	await $.session.measure(measure(90, 140_000, 0.1));

	await $.session.compact({ trigger: "auto", messages: [...TO_COMPACT] });
	await $.session.measure({
		...measure(3, 20_000, 0.2),
		rateLimits: [
			{ kind: "five_hour", percentUsed: 3, resetsAt: "2026-10-29T17:00" },
		],
	});
	await $.session.measure({
		...measure(4, 24_000, 0.3),
		rateLimits: [
			{ kind: "five_hour", percentUsed: 4, resetsAt: "2026-10-29T17:00" },
		],
	});

	// The reset gave no row, so the mark is still owed and lands on the next written row.
	expect(rowsOf()).toMatchObject([{ tokens: 24_000, afterCompaction: true }]);
});

test("a turn whose usage is absent writes no turn row", async ($: Engine, on: On) => {
	await begin($, on);

	await $.turn.complete({ ...done, turnId: "t1", isAborted: true });

	expect(turnsOf()).toBeUndefined();
});
