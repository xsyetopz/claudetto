// The shared setup of the tests of `tools/eval-variant.mjs`.
// The tool runs as a copy in a temporary repository with the same layout, so the real
// repository gets no worktree. A fake `claude` on `PATH` stands for `claude plugin eval`.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { withPathFirst, writeProgram } from "../support/fake-program.mjs";
import { PLUGINS, REPO, tmpDir } from "../support/repo.mjs";

const TOOL = path.join(REPO, "tools/eval-variant.mjs");
const LAB = path.join(PLUGINS, "dotclaude-lab");

// Writes a file in `evals/results/` of the plugin path (the argument after `eval`).
// Exits with `FAKE_EXIT`.
const FAKE_CLAUDE = `const fs = require("node:fs");
const path = require("node:path");
const plugin = process.argv[4];
const results = path.join(plugin, "evals", "results");
fs.mkdirSync(results, { recursive: true });
fs.writeFileSync(path.join(results, "run.txt"), plugin);
process.exit(Number(process.env.FAKE_EXIT ?? 0));
`;

export function git(cwd, ...args) {
  const r = spawnSync("git", ["-C", cwd, ...args], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout;
}

/** The repository of a test, with one commit and a branch. A copy of the template, because each `git` call costs most of the time on Windows. */
let template;
function templateRepo() {
  if (template) return template;
  const repo = path.join(tmpDir("lab-variant-template"), "repo");
  for (const d of [
    path.join(repo, "tools"),
    path.join(repo, "plugins/dotclaude"),
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
  template = repo;
  return repo;
}

export function setUp() {
  const dir = tmpDir("lab-variant");
  const repo = path.join(dir, "repo");
  const bin = path.join(dir, "bin");
  const tmp = path.join(dir, "tmp");
  for (const d of [bin, tmp]) fs.mkdirSync(d, { recursive: true });
  fs.cpSync(templateRepo(), repo, { recursive: true });
  writeProgram(bin, "claude", FAKE_CLAUDE);
  return { repo, bin, tmp };
}

export function run(s, ref, exit) {
  return spawnSync(
    process.execPath,
    [path.join(s.repo, "tools/eval-variant.mjs"), ref],
    {
      env: {
        ...withPathFirst(process.env, s.bin),
        TMPDIR: s.tmp,
        FAKE_EXIT: String(exit),
      },
      encoding: "utf8",
    },
  );
}

export const worktrees = (s) =>
  git(s.repo, "worktree", "list", "--porcelain")
    .split("\n")
    .filter((l) => l.startsWith("worktree "));
export const resultsRoot = (s) =>
  path.join(s.repo, "plugins/dotclaude/evals/results");
export const kept = (s) =>
  fs.readdirSync(resultsRoot(s)).filter((n) => n.startsWith("variant-"));
