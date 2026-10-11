// Pins `tools/eval-variant.mjs`: the temporary `git worktree` is removed at the end,
// and the results of the variant arm are copied out first.
// The tool runs as a copy in a temporary repository with the same layout, so the real
// repository gets no worktree. A fake `claude` on `PATH` stands for `claude plugin eval`.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { PLUGINS, REPO, tmpDir } from "../support/repo.mjs";

const TOOL = path.join(REPO, "tools/eval-variant.mjs");
const LAB = path.join(PLUGINS, "dotclaude-lab");

// Writes a file in `evals/results/` of the plugin path (the argument after `eval`).
// Exits with `FAKE_EXIT`.
const FAKE_CLAUDE = `#!${process.execPath}
const fs = require("node:fs");
const path = require("node:path");
const plugin = process.argv[4];
const results = path.join(plugin, "evals", "results");
fs.mkdirSync(results, { recursive: true });
fs.writeFileSync(path.join(results, "run.txt"), plugin);
process.exit(Number(process.env.FAKE_EXIT ?? 0));
`;

function git(cwd, ...args) {
  const r = spawnSync("git", ["-C", cwd, ...args], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout;
}

function setUp() {
  const dir = tmpDir("lab-variant");
  const repo = path.join(dir, "repo");
  const bin = path.join(dir, "bin");
  const tmp = path.join(dir, "tmp");
  for (const d of [
    path.join(repo, "tools"),
    path.join(repo, "plugins/dotclaude"),
    bin,
    tmp,
  ])
    fs.mkdirSync(d, { recursive: true });
  fs.copyFileSync(TOOL, path.join(repo, "tools/eval-variant.mjs"));
  // The tool calls the compare command of the plugin, so the copy has the plugin too.
  fs.cpSync(LAB, path.join(repo, "plugins/dotclaude-lab"), { recursive: true });
  fs.writeFileSync(path.join(repo, "plugins/dotclaude/README.md"), "plugin\n");
  fs.writeFileSync(
    path.join(repo, ".gitignore"),
    "/plugins/dotclaude/evals/results/\n",
  );
  fs.writeFileSync(path.join(bin, "claude"), FAKE_CLAUDE, { mode: 0o755 });
  git(repo, "init", "-q", "-b", "main");
  git(repo, "add", "-A");
  git(
    repo,
    "-c",
    "user.name=t",
    "-c",
    "user.email=t@example.com",
    "-c",
    "commit.gpgsign=false",
    "commit",
    "-q",
    "-m",
    "one",
  );
  git(repo, "branch", "feature/x+y");
  return { repo, bin, tmp };
}

function run(s, ref, exit) {
  return spawnSync(
    process.execPath,
    [path.join(s.repo, "tools/eval-variant.mjs"), ref],
    {
      env: {
        ...process.env,
        TMPDIR: s.tmp,
        PATH: `${s.bin}${path.delimiter}${process.env.PATH}`,
        FAKE_EXIT: String(exit),
      },
      encoding: "utf8",
    },
  );
}

const worktrees = (s) =>
  git(s.repo, "worktree", "list", "--porcelain")
    .split("\n")
    .filter((l) => l.startsWith("worktree "));
const resultsRoot = (s) => path.join(s.repo, "plugins/dotclaude/evals/results");
const kept = (s) =>
  fs.readdirSync(resultsRoot(s)).filter((n) => n.startsWith("variant-"));

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

test("a ref that does not exist stops the tool and leaves no worktree", () => {
  const s = setUp();
  const r = run(s, "no-such-ref", 0);
  assert.equal(r.status, 1);
  assert.equal(worktrees(s).length, 1);
});
