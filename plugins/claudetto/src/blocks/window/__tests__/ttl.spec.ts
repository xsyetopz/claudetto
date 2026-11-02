import { describe, expect, test } from "bun:test";
import type { SessionMeasureInput } from "claude-code";
import { NOT_MEASURED, reportText, ttlLines } from "../report.ts";
import { measureRow, type Reading, type WindowRow } from "../window.ts";

const input: SessionMeasureInput = {
	context: { tokens: 1000, window: 200_000 },
	rateLimits: [{ kind: "seven_day", percentUsed: 12, resetsAt: "r" }],
	cost: { usd: 3 },
	changed: ["rateLimits"],
};

const last: Reading = { sevenDay: 10, sevenResetsAt: "r", usd: 1 };

const row = (ttl: string | undefined, usd: number, sevenPoints: number) =>
	({
		at: 0,
		task: "t",
		source: "main",
		window: 200_000,
		usd,
		sevenPoints,
		...(ttl === undefined ? {} : { ttl }),
	}) satisfies WindowRow;

describe("the cache TTL of a window row", () => {
	test("a measured row records the `ttl` it ran under", () => {
		const made = measureRow(
			input,
			last,
			{ source: "main", task: "t", ttl: "1h" },
			0,
		);
		expect(made.row?.ttl).toBe("1h");
	});

	test("a row without a `ttl` in its tag records none", () => {
		const made = measureRow(input, last, { source: "main", task: "t" }, 0);
		expect(made.row).toBeDefined();
		expect(made.row).not.toHaveProperty("ttl");
	});
});

describe("the rate per cache TTL", () => {
	const rows = [row("1h", 2, 1), row("1h", 4, 2), row("auto", 1, 4)];

	test("rows under `1h` and `auto` print one rate each, and `5m` is not measured", () => {
		expect(ttlLines(rows)).toEqual([
			`Dollars per weekly percent, ttl 5m: ${NOT_MEASURED}`,
			"Dollars per weekly percent, ttl 1h: $2.00 over 2 rows",
			"Dollars per weekly percent, ttl auto: $0.25 over 1 row",
		]);
	});

	test("rows without a `ttl` or without weekly points count under no value", () => {
		expect(ttlLines([row(undefined, 5, 1), row("5m", 5, 0)])).toEqual([
			`Dollars per weekly percent, ttl 5m: ${NOT_MEASURED}`,
			`Dollars per weekly percent, ttl 1h: ${NOT_MEASURED}`,
			`Dollars per weekly percent, ttl auto: ${NOT_MEASURED}`,
		]);
	});

	test("the report holds the lines", () => {
		expect(reportText(rows, [])).toContain(
			"Dollars per weekly percent, ttl 1h: $2.00 over 2 rows",
		);
	});
});
