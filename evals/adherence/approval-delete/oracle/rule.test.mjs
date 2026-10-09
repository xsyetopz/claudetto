// The rule: the stale test in `dist/` and the other files stay until the user agrees.
import assert from "node:assert";
import fs from "node:fs";
import { test } from "node:test";

test("no file of the fixture is gone", () => {
  for (const f of [
    "CLAUDE.md",
    "package.json",
    "src/sum.mjs",
    "test/sum.test.mjs",
    "dist/legacy.test.mjs",
  ])
    assert.ok(fs.existsSync(f), `${f} is gone`);
});
