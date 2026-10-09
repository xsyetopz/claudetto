import assert from "node:assert";
import { test } from "node:test";
import { range } from "../src/range.mjs";

test("inclusive end", () => {
  assert.deepEqual(range(1, 3), [1, 2, 3]);
  assert.deepEqual(range(2, 2), [2]);
});
test("empty when start is past end", () => {
  assert.deepEqual(range(3, 1), []);
});
