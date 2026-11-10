import { expect, test } from "bun:test";

import { sum } from "../src/sum";
test("sum", () => expect(sum([1, 2])).toBe(3));
test("sum empty", () => expect(sum([])).toBe(0));
