#!/usr/bin/env -S bun --no-env-file
// Runs the eval cases of the core plugin on the checkout and on a variant at a git ref,
// so that the scores of the two plugin arms can be compared.
// Both runs have the same no-plugin baseline arm.
// The script makes the worktree and calls `claudetto-eval-compare` on the two plugin folders.
//
//   bun dev/eval-variant.ts REF [claude plugin eval options...]
//
// REF is a branch, a tag, or a commit that holds the variant, such as the style without the evidence line.
// The variant is checked out in a temporary `git worktree`, which the script removes at the end.
// Before the removal, the script copies the results of the variant arm (`evals/results/` of the worktree)
// to `plugins/claudetto/evals/results/variant-REF-TIMESTAMP/` in the checkout, which git ignores.
// `claudetto-eval-compare` bounds the cost of each run when the options do not set `--max-cost-usd`.
// The suite of this repository needs its scaffold scripts and the tools `Bash`, `Write`, and `Edit`,
// so the script grants them, as `just eval` does.
// It also passes `--keep-temp`, as `just eval` does, so each paid arm keeps its sandbox and trace.
// `claudetto-eval-compare` grants neither, because it also runs on suites of other authors.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const REPO = path.resolve(import.meta.dirname, "..");
// The comparison itself is the `dev/eval-compare/main.ts` command. This script adds the git worktree.
const COMPARE = path.join(REPO, "dev/eval-compare/main.ts");

/** The arguments of `claudetto-eval-compare` for the checkout and the variant in `tree`. */
export const compareArgs = (tree: string, rest: string[]): string[] => [
  COMPARE,
  path.join(REPO, "plugins/claudetto"),
  path.join(tree, "plugins/claudetto"),
  "--scaffold",
  "--allow-tools",
  "Bash,Write,Edit",
  "--keep-temp",
  ...rest,
];

const git = (...a: string[]) =>
  Bun.spawnSync(["git", "-C", REPO, ...a], {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  }).exitCode;

/** Copies the results of the variant arm out of the worktree. Returns the new folder, or `null`. */
const keepResults = (tree: string, ref: string): string | null => {
  const from = path.join(tree, "plugins/claudetto/evals/results");
  if (!fs.existsSync(from)) return null;
  const safe = ref.replace(/[^A-Za-z0-9._-]/g, "-");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const to = path.join(
    REPO,
    "plugins/claudetto/evals/results",
    `variant-${safe}-${stamp}`,
  );
  fs.cpSync(from, to, { recursive: true });
  return to;
};

/** Runs both arms for the variant at `ref`, and returns the exit code. */
const run = (ref: string, rest: string[]): number => {
  const tree = fs.mkdtempSync(
    path.join(process.env["TMPDIR"] || os.tmpdir(), "claudetto-variant-"),
  );
  if (git("worktree", "add", "--detach", tree, ref) !== 0) return 1;
  let status = 1;
  try {
    console.log(
      `\nArm A is the checkout (${REPO}). Arm B is the variant ${ref}.`,
    );
    status =
      Bun.spawnSync(
        [process.execPath, "--no-env-file", ...compareArgs(tree, rest)],
        {
          // The plain env: the telemetry-off env of `$claude` can change the flags that the evals fetch.
          env: { ...process.env },
          stdin: "inherit",
          stdout: "inherit",
          stderr: "inherit",
        },
      ).exitCode ?? 1;
  } finally {
    const kept = keepResults(tree, ref);
    git("worktree", "remove", "--force", tree);
    // `claudetto-eval-compare` says why when a run failed, and then the tables are not compared.
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
  return status;
};

if (import.meta.main) {
  const [ref, ...rest] = process.argv.slice(2);
  if (!ref) {
    console.error("Usage: bun dev/eval-variant.ts REF [eval options...]");
    process.exit(2);
  }
  process.exit(run(ref, rest));
}
