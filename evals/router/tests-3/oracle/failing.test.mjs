import assert from "node:assert";
import fs from "node:fs";
import { test } from "node:test";

test("FAILING.md lists the failing tests only", () => {
  const a = fs.readFileSync("FAILING.md", "utf8");
  for (const name of ["blue", "gray", "olive", "plum", "red", "rust", "taupe"])
    assert.ok(a.includes(`case ${name}`), `${name} is missing`);
  for (const name of ["green", "cyan", "pink", "teal", "navy", "lime", "gold", "ruby", "jade", "onyx", "rose", "sand", "mint", "ivory", "coral", "amber", "azure"])
    assert.ok(!a.includes(`case ${name}`), `${name} is listed`);
});
