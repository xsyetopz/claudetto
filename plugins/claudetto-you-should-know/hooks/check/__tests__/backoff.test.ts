import { describe, expect, test } from "claude-code/testing";

import { looksToSkipAfter, switchOf } from "../backoff";

describe("looksToSkipAfter", () => {
	test("is free for the first two ignored notes", () => {
		expect([0, 1, 2].map(looksToSkipAfter)).toEqual([0, 0, 0]);
	});

	test("doubles from the third and stops at 16", () => {
		expect([3, 4, 5, 6, 7].map(looksToSkipAfter)).toEqual([1, 2, 4, 8, 16]);
		expect(looksToSkipAfter(8)).toBe(16);
		expect(looksToSkipAfter(100)).toBe(16);
	});
});

describe("switchOf", () => {
	test("is on for 1, true, yes and on in any case", async () => {
		for (const word of ["1", "true", " YES ", "On"]) {
			expect(await switchOf(Promise.resolve(word))).toBe(true);
		}
	});

	test("is off for anything else, unset or a failed read", async () => {
		expect(await switchOf(Promise.resolve("0"))).toBe(false);
		expect(await switchOf(Promise.resolve(undefined))).toBe(false);
		expect(await switchOf(Promise.reject(new Error("no")))).toBe(false);
	});
});
