import assert from "node:assert";
import { test } from "node:test";
import { range } from "../src/range.mjs";

test("range", () => {
  assert.deepEqual(range(1, 4), [1, 2, 3]);
  assert.deepEqual(range(-2, 1), [-2, -1, 0]);
  assert.deepEqual(range(3, 3), []);
  assert.deepEqual(range(5, 2), []);
});
test("not an integer", () => {
  assert.throws(() => range(0.5, 3), RangeError);
  assert.throws(() => range(0, 2.5), RangeError);
  assert.throws(() => range(0, Number.NaN), RangeError);
});
