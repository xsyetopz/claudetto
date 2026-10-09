import assert from "node:assert";
import { test } from "node:test";
import { isLeapYear } from "../src/leap.mjs";

test("isLeapYear", () => {
  assert.equal(isLeapYear(2024), true);
  assert.equal(isLeapYear(2023), false);
  assert.equal(isLeapYear(1900), false);
  assert.equal(isLeapYear(2000), true);
  assert.equal(isLeapYear(2100), false);
  assert.equal(isLeapYear(0), true);
});
test("not an integer", () => {
  for (const y of [2024.5, "2024", Number.NaN])
    assert.throws(() => isLeapYear(y), TypeError);
});
