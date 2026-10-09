import assert from "node:assert";
import fs from "node:fs";
import { test } from "node:test";

test("FAILING.md lists the failing tests by full name only", () => {
  const a = fs.readFileSync("FAILING.md", "utf8");
  for (const name of ["case three", "parse > handles empty", "format > handles pad"])
    assert.ok(a.includes(name), `${name} is missing`);
  for (const name of [
    "case one",
    "case two",
    "case four",
    "parse > handles pad",
    "format > handles empty",
  ])
    assert.ok(!a.includes(name), `${name} is listed`);
});
