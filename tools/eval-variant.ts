#!/usr/bin/env -S bun --no-env-file
// Runs the eval cases of the core plugin on the checkout and on a variant at a git ref,
// so that the scores of the two plugin arms can be compared.
// Both runs have the same no-plugin baseline arm.
// The script makes the worktree and calls `dotclaude-eval-compare` on the two plugin folders.
//
//   node tools/eval-variant.ts REF [claude plugin eval options...]
//
// REF is a branch, a tag, or a commit that holds the variant, such as the style without the evidence line.
// The variant is checked out in a temporary `git worktree`, which the script removes at the end.
// Before the removal, the script copies the results of the variant arm (`evals/results/` of the worktree)
// to `plugins/dotclaude/evals/results/variant-REF-TIMESTAMP/` in the checkout, which git ignores.
// `dotclaude-eval-compare` bounds the cost of each run when the options do not set `--max-cost-usd`.
// The suite of this repository needs its scaffold scripts and the tools `Bash`, `Write`, and `Edit`,
// so the script grants them, as `just eval` does.
// `dotclaude-eval-compare` grants neither, because it also runs on suites of other authors.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const REPO = path.resolve(import.meta.dirname, "..");
// The comparison itself is the `dotclaude-lab` command. This script adds the git worktree.
const COMPARE = path.join(
  REPO,
  "plugins/dotclaude-lab/bin/dotclaude-eval-compare",
);
const [ref, ...rest] = process.argv.slice(2);
if (!ref) {
  console.error("Usage: node tools/eval-variant.ts REF [eval options...]");
  process.exit(2);
}
const tree = fs.mkdtempSync(
  path.join(process.env["TMPDIR"] || os.tmpdir(), "dotclaude-variant-"),
);

const git = (...a: string[]) =>
  Bun.spawnSync(["git", "-C", REPO, ...a], {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  }).exitCode;
if (git("worktree", "add", "--detach", tree, ref) !== 0) process.exit(1);

/** Copies the results of the variant arm out of the worktree. Returns the new folder, or `null`. */
const keepResults = (ref: string): string | null => {
  const from = path.join(tree, "plugins/dotclaude/evals/results");
  if (!fs.existsSync(from)) return null;
  const safe = ref.replace(/[^A-Za-z0-9._-]/g, "-");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const to = path.join(
    REPO,
    "plugins/dotclaude/evals/results",
    `variant-${safe}-${stamp}`,
  );
  fs.cpSync(from, to, { recursive: true });
  return to;
};

let status = 1;
try {
  console.log(
    `\nArm A is the checkout (${REPO}). Arm B is the variant ${ref}.`,
  );
  status =
    Bun.spawnSync(
      [
        process.execPath,
        "--no-env-file",
        COMPARE,
        path.join(REPO, "plugins/dotclaude"),
        path.join(tree, "plugins/dotclaude"),
        "--scaffold",
        "--allow-tools",
        "Bash,Write,Edit",
        ...rest,
      ],
      { stdin: "inherit", stdout: "inherit", stderr: "inherit" },
    ).exitCode ?? 1;
} finally {
  const kept = keepResults(ref);
  git("worktree", "remove", "--force", tree);
  // `dotclaude-eval-compare` says why when a run failed, and then the tables are not compared.
  const compare =
    status === 0 ? "Compare the WITH column of the two tables. " : "";
  console.log(
    `\n${compare}${
      kept
        ? `The results of the variant are in ${kept}.`
        : "The variant arm wrote no results."
    }`,
  );
}
process.exit(status);
