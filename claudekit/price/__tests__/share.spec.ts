import { describe, expect, test } from "bun:test";
import { shareText, WEEKLY_TOKENS, weeklyShare } from "../share.ts";

describe("`WEEKLY_TOKENS`", () => {
	test("is the 3.20B tokens of the week whose limit ran out", () => {
		expect(WEEKLY_TOKENS).toBe(3_200_000_000);
	});
});

describe("`weeklyShare`", () => {
	test("puts the whole week at 100%", () => {
		expect(weeklyShare(3_200_000_000)).toBe(100);
	});

	test("puts 32M tokens at 1%", () => {
		expect(weeklyShare(32_000_000)).toBe(1);
	});

	test("puts nothing at nothing", () => {
		expect(weeklyShare(0)).toBe(0);
	});
});

describe("`shareText`", () => {
	test("prints the 4,992,343 tokens of an 80-session eval at two significant digits", () => {
		expect(shareText(weeklyShare(4_992_343))).toBe("0.16%");
	});

	test("keeps two significant digits for a run far under 1%", () => {
		expect(shareText(weeklyShare(139_634))).toBe("0.0044%");
	});

	test("prints a large share without a trailing exponent", () => {
		expect(shareText(weeklyShare(600_000_000))).toBe("19%");
	});
});
