import assert from "node:assert";
import { test } from "node:test";
import { abs } from "../src/abs.mjs";

test("abs", () => {
  assert.equal(abs(-2), 2);
  assert.equal(abs(3), 3);
  assert.equal(abs(0), 0);
});
