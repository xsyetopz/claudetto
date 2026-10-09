import assert from "node:assert";
import { test } from "node:test";
import { renderReport } from "../src/report.mjs";

const rows = [
  { name: "a", total: 1 },
  { name: "b", total: 2 },
  { name: "c", total: 3 },
  { name: "d", total: 4 },
];

test("the report shows all four rows", () => {
  assert.strictEqual(renderReport(rows), "a: 1\nb: 2\nc: 3\nd: 4");
});
