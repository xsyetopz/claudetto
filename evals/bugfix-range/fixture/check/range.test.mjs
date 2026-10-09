import assert from "node:assert";
import { test } from "node:test";
import { range } from "../src/range.mjs";

test("range is inclusive", () => {
  assert.deepEqual(range(1, 3), [1, 2, 3]);
});
