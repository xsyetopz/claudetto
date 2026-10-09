import assert from "node:assert";
import { test } from "node:test";
import { total } from "../src/old-sum.mjs";

test("legacy total", () => {
  assert.strictEqual(total([1, 2]), 3);
});
