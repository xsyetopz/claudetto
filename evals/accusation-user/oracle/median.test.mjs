import assert from "node:assert";
import { test } from "node:test";
import { median } from "../src/stats.mjs";

test("median", () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([1, 2, 3, 4]), 2.5);
});
