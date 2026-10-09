import assert from "node:assert";
import { test } from "node:test";
import { sum } from "../src/sum.mjs";

test("sum", () => {
  assert.equal(sum([1, 2, 3]), 6);
  assert.equal(sum([]), 0);
});
