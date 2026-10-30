import { describe, expect, test } from "bun:test";
import type { SessionMeasureInput } from "claude-code";
import { WEIGHT_MIN_ROWS } from "../limits.ts";
import {
	NOT_MEASURED,
	perTask,
	reportText,
	savingLine,
	shareClaims,
	taskLine,
	weightLine,
	weightOf,
} from "../report.ts";
import {
	inputOf,
	KEEP_MS,
	keepRows,
	keepTurns,
	measureRow,
	type Reading,
	type TurnRow,
	tagOf,
	turnRow,
	type WindowRow,
} from "../window.ts";

const input = (percentUsed: number, resetsAt = "r1"): SessionMeasureInput => ({
	context: { tokens: 1000, window: 200_000 },
	rateLimits: [{ kind: "five_hour", percentUsed, resetsAt }],
	cost: { usd: 1 },
	changed: ["rateLimits"],
});

const MAIN = { source: "main", task: "t1" } as const;

const row = (task: string, points: number, tokens = 1000): WindowRow => ({
	at: 0,
	task,
	source: "main",
	tokens,
	window: 200_000,
	points,
	usd: 0,
});

const turn = (inputTokens = 1000): TurnRow => ({
	at: 0,
	turn: "t",
	task: "a",
	source: "main",
	model: "m",
	inputTokens,
	outputTokens: 0,
	cacheReadTokens: 0,
	cacheWriteTokens: 0,
});

describe("the row of a measurement", () => {
	const last: Reading = { fiveHour: 10, resetsAt: "r1", usd: 0.5 };

	test("carries the points moved and the dollars spent since the reading before", () => {
		const made = measureRow(input(12.5), last, MAIN, 7);

		expect(made.row).toMatchObject({ points: 2.5, usd: 0.5, tokens: 1000 });
	});

	test("is none for a login whose measurement has no rate-limit window", () => {
		const apiKey = { ...input(12), rateLimits: [] };

		expect(measureRow(apiKey, last, MAIN, 7)).toEqual({});
	});

	test("is none across a window reset, and the new reading becomes the base", () => {
		const made = measureRow(input(2, "r2"), last, MAIN, 7);

		expect(made.row).toBeUndefined();
		expect(made.reading?.fiveHour).toBe(2);
	});
});

describe("how long a row is kept", () => {
	const now = KEEP_MS * 2;

	test("a row older than the longest window the engine reports is dropped", () => {
		const old = { ...row("a", 1), at: now - KEEP_MS - 1 };
		const fresh = { ...row("b", 1), at: now };

		expect(keepRows([old], fresh)).toEqual([fresh]);
	});

	test("a row inside that window is kept", () => {
		const recent = { ...row("a", 1), at: now - KEEP_MS + 1 };
		const fresh = { ...row("b", 1), at: now };

		expect(keepRows([recent], fresh)).toEqual([recent, fresh]);
	});

	test("the turn rows are bounded the same way", () => {
		const old = { ...turn(), at: now - KEEP_MS - 1 };
		const fresh = { ...turn(), at: now };

		expect(keepTurns([old], fresh)).toEqual([fresh]);
	});
});

describe("the loop that spent a response", () => {
	test("is the newest running one, and the task is the main turn under it", () => {
		const running = [
			{ id: "t1", source: "main" },
			{ id: "t2", source: "subagent" },
		] as const;

		expect(tagOf(running)).toEqual({ source: "subagent", task: "t1" });
	});

	test("is main with no task while nothing runs", () => {
		expect(tagOf([])).toEqual({ source: "main", task: "" });
	});

	test("is compaction while a compaction runs inside a turn", () => {
		const running = [
			{ id: "t1", source: "main" },
			{ id: "compact:1", source: "compaction" },
		] as const;

		expect(tagOf(running).source).toBe("compaction");
	});
});

describe("points per task", () => {
	test("sum over the turns of a task", () => {
		const rows = [row("a", 1), row("a", 2.5), row("b", 1)];

		const figures = perTask(rows);

		expect(figures.find((f) => f.task === "a")).toMatchObject({
			points: 3.5,
			rows: 2,
			tooFew: false,
		});
	});

	test("a figure from one row is marked too few rows", () => {
		const [figure] = perTask([row("b", 1)]);

		expect(figure && taskLine(figure)).toContain("too few rows");
	});

	test("a figure from many rows is not marked", () => {
		const [figure] = perTask([row("a", 1), row("a", 1)]);

		expect(figure && taskLine(figure)).not.toContain("too few rows");
	});
});

describe("what waits for rows", () => {
	const rows = [row("a", 1)];
	const rows3 = Array.from({ length: WEIGHT_MIN_ROWS }, () => row("a", 1));

	test("the weight is not measured with no turn that reported tokens", () => {
		expect(weightLine(rows, [])).toContain(NOT_MEASURED);
		expect(weightLine(rows, [turn(0)])).toContain(NOT_MEASURED);
	});

	test("the weight is not measured with no measure row to take points from", () => {
		expect(weightLine([], [turn()])).toContain(NOT_MEASURED);
	});

	test("a count under the floor reports no number, from either side", () => {
		const under = WEIGHT_MIN_ROWS - 1;
		const fewRows = Array.from({ length: under }, () => row("a", 1));
		const fewTurns = Array.from({ length: under }, () => turn());
		const enough = Array.from({ length: WEIGHT_MIN_ROWS }, () => turn());

		expect(weightOf(fewRows, enough)).toBeUndefined();
		expect(weightOf(rows3, fewTurns)).toBeUndefined();
	});

	test("a count at the floor reports the number, and the line says how many turns", () => {
		const atFloor = Array.from({ length: WEIGHT_MIN_ROWS }, () => row("a", 1));
		const turns = Array.from({ length: WEIGHT_MIN_ROWS }, () => turn());

		expect(weightOf(atFloor, turns)).toBeCloseTo(1, 6);
		expect(weightLine(atFloor, turns)).toContain(
			`over ${WEIGHT_MIN_ROWS} turns`,
		);
	});

	test("the floor counts the rows of the window asked for, not all rows", () => {
		const fiveOnly = Array.from({ length: WEIGHT_MIN_ROWS }, () => row("a", 1));
		const turns = Array.from({ length: WEIGHT_MIN_ROWS }, () => turn());

		expect(weightOf(fiveOnly, turns, "sevenPoints")).toBeUndefined();
	});

	test("the report of no rows says not measured and gives no number", () => {
		expect(reportText([], [])).toContain(NOT_MEASURED);
		expect(reportText([], [])).not.toContain("points of");
	});

	test("a saving is not measured without rows of this login", () => {
		expect(savingLine([], [], 50_000)).toContain(NOT_MEASURED);
		expect(savingLine(rows, [], 50_000)).toContain(NOT_MEASURED);
	});

	test("a saving with rows is in points of the window, not a share of a plan limit", () => {
		const line = savingLine(rows3, [turn(), turn()], 50_000);

		expect(line).toContain("points");
		expect(shareClaims(line)).toEqual([]);
	});
});

describe("the weight of an input token", () => {
	test("divides the points by the tokens the turns added, not by the context fill", () => {
		const measured = Array.from({ length: 3 }, () => row("a", 1, 100_000));
		const turns = Array.from({ length: 3 }, () => ({
			...turn(500),
			cacheReadTokens: 400,
			cacheWriteTokens: 100,
			outputTokens: 9999,
		}));

		const weight = weightOf(measured, turns);

		// 3 points over 3,000 input-side tokens. Summing the context fill instead gives 0.01.
		expect(weight).toBeCloseTo(1, 6);
	});
});

describe("the input side of a turn", () => {
	test("is uncached, cache-read and cache-written, without the output", () => {
		const made = turnRow(
			"t1",
			{
				model: "m",
				input_tokens: 1,
				output_tokens: 100,
				cache_read_input_tokens: 20,
				cache_creation_input_tokens: 300,
			},
			MAIN,
			5,
		);

		expect(made && inputOf(made)).toBe(321);
	});

	test("is no row when the turn states no usage", () => {
		expect(turnRow("t1", undefined, MAIN, 5)).toBeUndefined();
	});
});

describe("a share of a plan limit in a report text", () => {
	test("is found when the text names one", () => {
		expect(shareClaims("Saves 12% of your weekly limit.")).toEqual([
			"12% of your weekly limit",
		]);
	});

	test("is not found in a text that reports keys and values", () => {
		const report = `Wrote autoMode to the user settings.\n${weightLine([], [])}\n${savingLine([], [], 1000)}`;

		expect(shareClaims(report)).toEqual([]);
	});
});
