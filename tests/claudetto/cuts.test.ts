import { describe, expect, test } from "bun:test";
import {
	type Cut,
	pricedCuts,
	risingCuts,
	shippedChars,
	unpricedCuts,
} from "../../plugins/claudetto/src/cuts.ts";

describe("the inventory accounts for the whole fall", () => {
	test("a row that adds text counts against the fall", () => {
		const cuts: readonly Cut[] = [
			{ name: "a trim", chars: 500 },
			{ name: "a piece the tree adds", chars: -78 },
		];

		expect(shippedChars(cuts)).toBe(422);
	});
});

describe("a cut counts as a saving only with a bill reading", () => {
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
