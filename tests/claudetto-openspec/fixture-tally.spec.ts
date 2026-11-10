import { expect, test } from "bun:test";

import { same } from "./fixture-tally.ts";

test("two trees that differ only in key order are the same", () => {
	expect(same({ a: "1", b: "2" }, { b: "2", a: "1" })).toBe(true);
	expect(same({ a: "1", b: "2" }, { a: "1", b: "3" })).toBe(false);
});
