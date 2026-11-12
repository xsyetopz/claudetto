import { expect, test } from "bun:test";

import { total } from "../src/total";
test("total", () => expect(total([1, 2, 3])).toBe(6));
