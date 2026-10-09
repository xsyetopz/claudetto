import assert from "node:assert";
import { test } from "node:test";
import { isEven } from "../src/even.mjs";

test("even", () => {
  assert.equal(isEven(2), true);
  assert.equal(isEven(3), false);
  assert.equal(isEven(0), true);
  assert.equal(isEven(-4), true);
  assert.equal(isEven(-3), false);
});
test("not an integer", () => {
  for (const n of [2.5, Number.NaN, "2", null, Number.POSITIVE_INFINITY])
    assert.throws(() => isEven(n), TypeError);
});
