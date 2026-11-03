import { expect, test } from "bun:test";
import { parseRange } from "./parse.ts";

test("a range is inclusive at both ends", () => {
	expect(parseRange("3-5")).toEqual([3, 4, 5]);
});

test("a single-number range holds that number", () => {
	expect(parseRange("7-7")).toEqual([7]);
});
