import assert from "node:assert";
import { test } from "node:test";
import { abs } from "../src/abs.mjs";

test("abs", () => {
  assert.equal(abs(-2), 2);
});
