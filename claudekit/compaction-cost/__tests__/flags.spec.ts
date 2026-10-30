import { describe, expect, test } from "bun:test";
import { argOf, numbersOf, oneOf } from "../flags.ts";

describe("argOf", () => {
	test("returns the value after the flag", () => {
		expect(argOf(["--seed", "7", "--per", "3"], "per")).toBe("3");
	});

	test("returns none for an absent flag", () => {
		expect(argOf(["--seed", "7"], "per")).toBeUndefined();
	});
});

describe("oneOf", () => {
	test("--charge 0 stays zero and does not fall back", () => {
		expect(oneOf(argOf(["--charge", "0"], "charge"), 20.1)).toBe(0);
	});

	test("a positive value is read", () => {
		expect(oneOf("12.5", 20)).toBe(12.5);
	});

	test("an absent, negative, or non-numeric value takes the fallback", () => {
		expect(oneOf(undefined, 20)).toBe(20);
		expect(oneOf("-1", 20)).toBe(20);
		expect(oneOf("abc", 20)).toBe(20);
	});
});

describe("numbersOf", () => {
	test("reads a comma list", () => {
		expect(numbersOf("120000, 200000", [1])).toEqual([120_000, 200_000]);
	});

	test("drops zero, negative, and non-numeric parts", () => {
		expect(numbersOf("0,-5,x,90000", [1])).toEqual([90_000]);
	});

	test("an empty or absent list takes the fallback", () => {
		expect(numbersOf(undefined, [1, 2])).toEqual([1, 2]);
		expect(numbersOf("0", [1, 2])).toEqual([1, 2]);
	});
});
