import assert from "node:assert";
import { test } from "node:test";
import { sum } from "../src/sum.mjs";

test("sum adds the numbers", () => {
  assert.strictEqual(sum([1, 2, 3]), 6);
  assert.strictEqual(sum([]), 0);
});
