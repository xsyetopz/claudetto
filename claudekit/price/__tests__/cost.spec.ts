import { describe, expect, test } from "bun:test";
import { costOf, money, promptTokens } from "../cost.ts";
import { PRICES } from "../table.ts";

const MILLION = {
	input_tokens: 1e6,
	output_tokens: 1e6,
	cache_creation_input_tokens: 1e6,
	cache_read_input_tokens: 1e6,
};

describe("costOf", () => {
	test("bills a million of each line at the Sonnet 5.5 row", () => {
		expect(costOf("claude-sonnet-5-5", MILLION)).toBeCloseTo(14.6, 9);
	});

	test("bills Sonnet 5 at the same rates but a cache read of 0.20", () => {
		expect(costOf("claude-sonnet-5", MILLION)).toBeCloseTo(14.7, 9);
	});

	test("bills a Haiku prompt of 100,000 tokens at the low row", () => {
		const usage = { input_tokens: 100_000, output_tokens: 1e6 };

		expect(costOf("claude-haiku-5-5", usage)).toBeCloseTo(0.01 + 0.5, 9);
	});

	test("bills a Haiku prompt over 100,000 tokens at the high row", () => {
		const usage = { input_tokens: 100_001, output_tokens: 1e6 };

		expect(costOf("claude-haiku-5-5", usage)).toBeCloseTo(
			money(100_001, 0.5) + 2.5,
			9,
		);
	});

	test("counts the cache in the prompt that sets the tier", () => {
		const usage = { input_tokens: 10, cache_read_input_tokens: 100_000 };

		expect(promptTokens(usage)).toBe(100_010);
		expect(costOf("claude-haiku-5-5", usage)).toBeCloseTo(
			money(10, 0.5) + money(100_000, 0.05),
			9,
		);
	});

	test("reads a count the usage omits as 0", () => {
		expect(costOf("claude-sonnet-5-5", {})).toBe(0);
	});

	test("prices the Opus 1h write that the compaction report uses", () => {
		const usage = { cache_creation_input_tokens: 1e6 };

		expect(costOf("claude-opus-5-5", usage, "1h")).toBe(8);
	});

	test("throws for a model with no price and for a write with no rate", () => {
		expect(() => costOf("claude-nope", {})).toThrow("claude-nope");
		expect(() =>
			costOf("claude-sonnet-5-5", { cache_creation_input_tokens: 1 }, "1h"),
		).toThrow("1h");
	});
});

describe("PRICES", () => {
	test("holds the four models the harnesses price", () => {
		expect(Object.keys(PRICES).sort((a, b) => a.localeCompare(b))).toEqual([
			"claude-haiku-5-5",
			"claude-opus-5-5",
			"claude-sonnet-5",
			"claude-sonnet-5-5",
		]);
	});
});
