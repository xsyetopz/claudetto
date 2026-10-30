import { describe, expect, test } from "bun:test";
import {
	type Cut,
	pricedCuts,
	risingCuts,
	SHIPPED_CUTS,
	SHIPPED_TOTAL,
	shippedChars,
	unpricedCuts,
} from "../../plugins/claudetto/src/cuts.ts";
import { BASELINE_TOTAL } from "../../plugins/claudetto/src/deny.ts";

describe("the inventory accounts for the whole fall", () => {
	test("the baseline less every shipped cut is the shipped reading", () => {
		expect(BASELINE_TOTAL - shippedChars()).toBe(SHIPPED_TOTAL);
	});

	test("the cuts that move request text add up to the fall of the shipped arm", () => {
		const moving = SHIPPED_CUTS.filter((cut) => cut.chars !== 0);

		expect(moving.map((cut) => cut.name)).toEqual([
			"deny list",
			"tool texts",
			"built-in surface",
			"dedupe skill",
			"docs skill",
			"main agent body",
			"plugin system text",
			"agent listing",
			"handoff context",
			"output style",
			"sandbox block",
			"setup command listing",
		]);
		expect(shippedChars(moving)).toBe(BASELINE_TOTAL - SHIPPED_TOTAL);
	});

	test("a row that adds text counts against the fall", () => {
		const cuts: readonly Cut[] = [
			{ name: "a trim", chars: 500 },
			{ name: "a piece the tree adds", chars: -78 },
		];

		expect(shippedChars(cuts)).toBe(422);
	});
});

describe("a cut counts as a saving only with a bill reading", () => {
	test("the compaction pair is the one priced cut of the shipped tree", () => {
		expect(pricedCuts().map((cut) => cut.name)).toEqual(["compaction pair"]);
	});

	test("the character cuts are named as unpriced", () => {
		expect(unpricedCuts()).toEqual([
			"deny list",
			"tool texts",
			"built-in surface",
			"dedupe skill",
			"docs skill",
			"idleCompaction off",
			"main agent body",
			"plugin system text",
			"agent listing",
			"handoff context",
			"output style",
			"autoMode lists",
			"sandbox block",
			"setup command listing",
		]);
	});

	test("a shorter request with no reading is not a priced cut", () => {
		const cuts: readonly Cut[] = [{ name: "big trim", chars: 9999 }];

		expect(pricedCuts(cuts)).toEqual([]);
		expect(unpricedCuts(cuts)).toEqual(["big trim"]);
	});

	test("a reading where the score falls and the bill rises turns the cut down", () => {
		const cuts: readonly Cut[] = [
			{
				name: "tool output trim",
				chars: 38_400,
				cost: { shift: 6.8, source: "arXiv 2607.12161" },
			},
		];

		expect(risingCuts(cuts)).toEqual(["tool output trim"]);
		expect(pricedCuts(cuts)).toEqual([]);
	});

	test("no shipped cut has a reading that turns it down", () => {
		expect(risingCuts()).toEqual([]);
	});
});
