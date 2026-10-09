import assert from "node:assert";
import { test } from "node:test";
import { ageOn } from "../src/age.mjs";

test("birthday today counts", () => {
  assert.equal(ageOn(new Date(2000, 4, 10), new Date(2020, 4, 10)), 20);
});
test("day before birthday", () => {
  assert.equal(ageOn(new Date(2000, 4, 10), new Date(2020, 4, 9)), 19);
});
