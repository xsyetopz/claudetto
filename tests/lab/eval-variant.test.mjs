// Pins `tools/eval-variant.mjs`: the temporary `git worktree` is removed at the end of each run.
// The results tests are in `results-copy.test.mjs`, so each file stays inside the time bound of a test file.

import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { run, setUp, worktrees } from "./fixture-repo.mjs";

for (const [name, exit] of [
  ["succeeds", 0],
  ["fails", 1],
]) {
  test(`the worktree is removed when the eval ${name}`, () => {
    const s = setUp();
    const r = run(s, "HEAD", exit);
    assert.equal(r.status, exit, r.stderr);
    assert.deepEqual(fs.readdirSync(s.tmp), []);
    assert.equal(worktrees(s).length, 1);
  });
}

test("a ref that does not exist stops the tool and leaves no worktree", () => {
  const s = setUp();
  const r = run(s, "no-such-ref", 0);
  assert.equal(r.status, 1);
  assert.equal(worktrees(s).length, 1);
});
