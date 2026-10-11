// Pins `tools/eval-variant.mjs`: the results of the variant arm are copied out before the worktree goes.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { git, kept, resultsRoot, run, setUp } from "./fixture-repo.mjs";

test("the variant results are copied to a folder that the message names, and the worktree is gone", () => {
  const s = setUp();
  const r = run(s, "feature/x+y", 0);
  assert.equal(r.status, 0, r.stderr);
  const folders = kept(s);
  assert.equal(folders.length, 1);
  assert.match(folders[0], /^variant-feature-x-y-\d{4}-\d\d-\d\dT[\d-]+Z$/);
  const folder = path.join(resultsRoot(s), folders[0]);
  assert.ok(r.stdout.includes(folder), r.stdout);
  const saved = fs.readFileSync(path.join(folder, "run.txt"), "utf8");
  // The file comes from the variant arm: the plugin path was in the worktree.
  assert.ok(
    saved.startsWith(s.tmp) || saved.includes("dotclaude-variant-"),
    saved,
  );
  assert.ok(!fs.existsSync(saved));
  assert.deepEqual(fs.readdirSync(s.tmp), []);
  // Git ignores the folder.
  assert.equal(git(s.repo, "status", "--porcelain"), "");
});

test("the variant results survive when the eval fails", () => {
  const s = setUp();
  const r = run(s, "HEAD", 1);
  assert.equal(r.status, 1);
  assert.equal(kept(s).length, 1);
});
