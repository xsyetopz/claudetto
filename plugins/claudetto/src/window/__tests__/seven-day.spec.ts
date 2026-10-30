// The seven-day window beside the five-hour one: one row holds a delta for each, absence is not a zero,
// and a reset is read per window. Every figure the report prints names the window it belongs to.

import { describe, expect, test } from "bun:test";
import type { SessionMeasureInput } from "claude-code";
import {
	NOT_MEASURED,
	perTask,
	savingLine,
	taskLine,
	weightLine,
} from "../report.ts";
import {
	measureRow,
	type Reading,
	type TurnRow,
	type WindowRow,
} from "../window.ts";

const MAIN = { source: "main", task: "t1" } as const;

const input = (
	limits: SessionMeasureInput["rateLimits"],
): SessionMeasureInput => ({
	context: { tokens: 1000, window: 200_000 },
	rateLimits: limits,
	cost: { usd: 1 },
	changed: ["rateLimits"],
});

const five = (percentUsed: number, resetsAt = "f1") => ({
	kind: "five_hour",
	percentUsed,
	resetsAt,
});

const seven = (percentUsed: number, resetsAt = "s1") => ({
	kind: "seven_day",
	percentUsed,
	resetsAt,
});

const last: Reading = {
	fiveHour: 10,
	resetsAt: "f1",
	sevenDay: 40,
	sevenResetsAt: "s1",
	usd: 0.5,
};

describe("the row of a measurement with two windows", () => {
	test("one row holds both deltas", () => {
		const made = measureRow(input([five(12), seven(41.5)]), last, MAIN, 7);

		expect(made.row).toMatchObject({ points: 2, sevenPoints: 1.5 });
		expect(made.reading).toMatchObject({ fiveHour: 12, sevenDay: 41.5 });
	});

	test("a measurement with only the five-hour window leaves the seven-day figure absent", () => {
		const made = measureRow(input([five(12)]), last, MAIN, 7);

		expect(made.row?.points).toBe(2);
		expect(made.row && "sevenPoints" in made.row).toBe(false);
	});

	test("a seven-day figure that did not move is a measured zero", () => {
		const made = measureRow(input([five(12), seven(40)]), last, MAIN, 7);

		expect(made.row?.sevenPoints).toBe(0);
	});

	test("a login with neither window leaves no row and no reading", () => {
		expect(measureRow(input([]), last, MAIN, 7)).toEqual({});
	});

	test("a five-hour reset leaves the seven-day delta in the row", () => {
		const made = measureRow(input([five(2, "f2"), seven(41)]), last, MAIN, 7);

		expect(made.row?.sevenPoints).toBe(1);
		expect(made.row && "points" in made.row).toBe(false);
		expect(made.reading).toMatchObject({ fiveHour: 2, resetsAt: "f2" });
	});

	test("a seven-day reset leaves the five-hour delta in the row", () => {
		const made = measureRow(input([five(12), seven(3, "s2")]), last, MAIN, 7);

		expect(made.row?.points).toBe(2);
		expect(made.row && "sevenPoints" in made.row).toBe(false);
	});

	test("a reset of the only window gives a reading and no row", () => {
		const made = measureRow(input([five(2, "f2")]), last, MAIN, 7);

		expect(made.row).toBeUndefined();
		expect(made.reading?.fiveHour).toBe(2);
	});
});

const row = (points?: number, sevenPoints?: number): WindowRow => ({
	at: 0,
	task: "a",
	source: "main",
	tokens: 1000,
	window: 200_000,
	usd: 0,
	...(points === undefined ? {} : { points }),
	...(sevenPoints === undefined ? {} : { sevenPoints }),
});

const turn: TurnRow = {
	at: 0,
	turn: "t",
	task: "a",
	source: "main",
	model: "m",
	inputTokens: 1000,
	outputTokens: 0,
	cacheReadTokens: 0,
	cacheWriteTokens: 0,
};

describe("every reported figure names its window", () => {
	const both = [row(1, 2), row(1, 2)];
	const fiveOnly = [row(1), row(1)];

	test("a task line from rows with both windows names both", () => {
		const [figure] = perTask(both);

		const line = figure ? taskLine(figure) : "";

		expect(line).toContain("2 points of the five-hour window");
		expect(line).toContain("4 points of the seven-day window");
	});

	test("a task line from five-hour rows says the seven-day figure is not measured", () => {
		const [figure] = perTask(fiveOnly);

		const line = figure ? taskLine(figure) : "";

		expect(line).toContain("points of the five-hour window");
		expect(line).toContain(`seven-day window: ${NOT_MEASURED}`);
	});

	test("the weight names both windows, or says the seven-day one is not measured", () => {
		expect(weightLine(both, [turn])).toContain("of the seven-day window");
		expect(weightLine(fiveOnly, [turn])).toContain(
			`seven-day window: ${NOT_MEASURED}`,
		);
	});

	test("the saving names both windows, or says the seven-day one is not measured", () => {
		expect(savingLine(both, [turn], 1000)).toContain("of the seven-day window");
		expect(savingLine(fiveOnly, [turn], 1000)).toContain(
			`seven-day window: ${NOT_MEASURED}`,
		);
	});

	test("rows with only the seven-day window say the five-hour figure is not measured", () => {
		const [figure] = perTask([row(undefined, 3)]);

		expect(figure && taskLine(figure)).toContain(
			`five-hour window: ${NOT_MEASURED}`,
		);
	});
});
