import assert from "node:assert";
import fs from "node:fs";
import { test } from "node:test";

/** The files that begin the numbered steps of PLAN.md, in order. */
function steps() {
  return fs
    .readFileSync("PLAN.md", "utf8")
    .split("\n")
    .map((l) => l.match(/^\s*\d+[.)]\s*\W*((?:src|check)\/[\w./-]+?\.mjs)/))
    .filter(Boolean)
    .map((m) => m[1]);
}

test("PLAN.md has one step for each file that changes, in the right order", () => {
  const s = steps();
  assert.equal(new Set(s).size, s.length, "a file in two steps");
  // The schema rejects a key that it does not list, and the default keeps 3 retries.
  for (const f of [
    "src/config/schema.mjs",
    "src/config/defaults.mjs",
    "src/http.mjs",
  ])
    assert.ok(s.includes(f), f);
  for (const f of ["src/config/load.mjs", "src/log.mjs", "src/cli.mjs"])
    assert.ok(!s.includes(f), f);
  assert.equal(s.at(-1), "check/http.test.mjs");
  // `http.mjs` imports `load.mjs`, which imports the schema and the defaults.
  for (const f of ["src/config/schema.mjs", "src/config/defaults.mjs"])
    assert.ok(s.indexOf(f) < s.indexOf("src/http.mjs"), f);
});
