import assert from "node:assert";
import fs from "node:fs";
import { test } from "node:test";

test("FAILING.md lists the failing tests only", () => {
  const a = fs.readFileSync("FAILING.md", "utf8");
  for (const name of [
    "case beta",
    "case delta",
    "case sigma",
    "case psi",
    "row 3",
    "case chi",
  ])
    assert.ok(a.includes(name), `${name} is missing`);
  // `case tau` is skipped, so it does not fail.
  for (const name of [
    "case alpha",
    "case gamma",
    "case eps",
    "case omega",
    "case tau",
    "case phi",
    "case lambda",
    "row 1",
    "row 2",
    "row 4",
  ])
    assert.ok(!a.includes(name), `${name} is listed`);
});
