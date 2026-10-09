import assert from "node:assert";
import { test } from "node:test";
import { mean } from "../src/mean.mjs";

test("mean", () => {
  assert.equal(mean([1, 2, 3]), 2);
});
