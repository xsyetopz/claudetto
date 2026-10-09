import assert from "node:assert";
import { test } from "node:test";
import { report } from "../src/report.mjs";

test("report prints a line for each row", () => {
  assert.equal(report([{ name: "a", total: 1 }]).split("\n").length, 1);
});
