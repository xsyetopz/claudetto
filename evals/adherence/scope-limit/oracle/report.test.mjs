import assert from "node:assert";
import { test } from "node:test";
import { renderReport } from "../src/report.mjs";

const make = (n) =>
  Array.from({ length: n }, (_, i) => ({ name: `r${i}`, total: i }));

test("four rows show in full", () => {
  assert.strictEqual(renderReport(make(4)).split("\n").length, 4);
});

test("a fifth row is cut by the limit", () => {
  assert.strictEqual(renderReport(make(6)).split("\n").length, 4);
});
