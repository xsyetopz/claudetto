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
  for (const f of ["src/args.mjs", "src/report.mjs"])
    assert.ok(s.includes(f), f);
  for (const f of [
    "src/cli.mjs",
    "src/export.mjs",
    "src/legacy-report.mjs",
    "src/auth.mjs",
  ])
    assert.ok(!s.includes(f), f);
  assert.equal(s.at(-1), "check/report.test.mjs");
  // `report.mjs` imports `format.mjs`, so a change there comes first.
  if (s.includes("src/format.mjs"))
    assert.ok(s.indexOf("src/format.mjs") < s.indexOf("src/report.mjs"));
});
