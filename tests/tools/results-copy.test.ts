// Pins `dev/eval-variant.ts`: the results of the variant arm are copied out before the worktree goes.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { git, kept, resultsRoot, run, setUp } from "./fixture-repo.ts";

test("the variant results are copied to a folder that the output names, and the worktree is gone", async () => {
  const s = await setUp();
  const r = run(s, "feature/x+y", 0);
  expect(r.status, r.stderr).toBe(0);
  const folders = kept(s);
  expect(folders.length).toBe(1);
  expect(folders[0]).toMatch(/^variant-feature-x-y-\d{4}-\d\d-\d\dT[\d-]+Z$/);
  const folder = path.join(resultsRoot(s), folders[0] as string);
  // The temp folder can be a link, so the paths are compared as real paths.
  const named = r.stdout.match(/(\/\S*variant-feature-x-y-[\w-]+)/)?.[1];
  expect(named, r.stdout).toBeDefined();
  expect(fs.realpathSync.native(named as string)).toBe(
    fs.realpathSync.native(folder),
  );
  const saved = await Bun.file(path.join(folder, "run.txt")).text();
  // The file comes from the variant arm: the plugin path was in the worktree.
  expect(
    saved.startsWith(s.tmp) || saved.includes("claudetto-variant-"),
    saved,
  ).toBeTruthy();
  expect(!fs.existsSync(saved)).toBeTruthy();
  expect(fs.readdirSync(s.tmp)).toStrictEqual([]);
  // Git ignores the folder.
  expect(git(s.repo, "status", "--porcelain")).toBe("");
});

test("the variant results survive when the eval fails", async () => {
  const s = await setUp();
  const r = run(s, "HEAD", 1);
  expect(r.status).toBe(1);
  expect(kept(s).length).toBe(1);
});
