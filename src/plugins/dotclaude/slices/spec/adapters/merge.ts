// `dotclaude-spec merge <package> <branch>`: merges the branch of a package that passed review.
// The steps are the steps of `/ship`:
//   0. The lane of the package must be `review`, and the branch must be a commit that is not the current branch.
//      The tree must hold no change except the store files of the change, which the command commits first.
//   1. `git merge --no-edit <branch>`. On a conflict the command stops, sets no lane, and prints the conflicted files.
//   2. `just generate`, when the project has a `justfile`.
//   3. The lane of the package becomes `done`.
//   4. One commit of `plugins/` and the store files of the change, and nothing else.
// Only the main checkout merges, as only the main checkout changes a lane.

import path from "node:path";
import { runProgram } from "../../../../../kernel/node/process.ts";
import { SPEC_ROOT } from "../../../../../kernel/paths.ts";
import { changeOf, inLinkedWorktree, moveLane } from "./lane.ts";
import type { Run } from "./run.ts";

const GENERATED_DIR = "plugins";

interface Result {
  code: number;
  out: string;
  /** The standard output with no trim, for the output that has meaning in its blanks. */
  stdout: string;
}

/** Runs `file` with `args` in the root of the store. A program that is not found gives code 127. */
const exec = (run: Run, file: string, args: string[]): Result => {
  try {
    const r = runProgram(file, args, {
      cwd: run.store.root,
      stdin: "ignore",
      stdout: "pipe",
      stderr: "pipe",
      timeout: 600_000,
    });
    return {
      code: r.exitCode ?? 1,
      stdout: r.stdout?.toString() ?? "",
      out: `${r.stdout?.toString() ?? ""}${r.stderr?.toString() ?? ""}`.trim(),
    };
  } catch (err) {
    return {
      code: 127,
      stdout: "",
      out: err instanceof Error ? err.message : String(err),
    };
  }
};

/** The files that the merge left in conflict. */
const conflicted = (run: Run): string[] =>
  exec(run, "git", ["diff", "--name-only", "--diff-filter=U"])
    .out.split("\n")
    .filter((f) => f !== "");

/** True when the project has a generator: a `justfile` in the root. */
const hasGenerator = (run: Run): boolean => run.store.exists("justfile");

/** The store files of the change `id` that the lane commands write, relative to the root of the store. */
const storeFiles = (id: string): string[] =>
  ["events.jsonl", "packages.md"].map((f) => path.posix.join(SPEC_ROOT, id, f));

interface Tree {
  staged: boolean;
  /** The tracked files that differ from `HEAD`, relative to the root of the store. */
  files: string[];
}

/** The tracked files that changed, and whether any change is staged. Untracked files do not count. */
const treeState = (run: Run): Tree => {
  const prefix = exec(run, "git", ["rev-parse", "--show-prefix"]).out;
  const status = exec(run, "git", [
    "status",
    "--porcelain",
    "-z",
    "--untracked-files=no",
  ]);
  const tokens = status.stdout.split("\0").filter((t) => t !== "");
  const tree: Tree = { staged: false, files: [] };
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i] ?? "";
    const index = token[0] ?? " ";
    if (index !== " ") tree.staged = true;
    if (index === "R" || index === "C") i++;
    const file = token.slice(3);
    tree.files.push(
      prefix && file.startsWith(prefix) ? file.slice(prefix.length) : file,
    );
  }
  return tree;
};

/** Gives a message and false when `branch` is not a commit that the merge can use. */
const branchUsable = (run: Run, branch: string): boolean => {
  if (branch.startsWith("-")) {
    run.io.error(`The branch \`${branch}\` starts with a dash.`);
    return false;
  }
  const verify = exec(run, "git", [
    "rev-parse",
    "--verify",
    "--quiet",
    "--end-of-options",
    `${branch}^{commit}`,
  ]);
  if (verify.code !== 0) {
    run.io.error(`The branch \`${branch}\` is not a commit.`);
    return false;
  }
  const current = exec(run, "git", [
    "symbolic-ref",
    "--quiet",
    "--short",
    "HEAD",
  ]);
  if (current.code === 0 && current.out === branch) {
    run.io.error(`The branch \`${branch}\` is the current branch.`);
    return false;
  }
  return true;
};

/** Commits the store files of the change when they are the only changes. Gives false with a message when the merge must not start. */
const settleTree = (run: Run, id: string, pkg: string): boolean => {
  const tree = treeState(run);
  const mine = storeFiles(id);
  const others = tree.files.filter((f) => !mine.includes(f));
  if (tree.staged || others.length > 0) {
    run.io.error(
      `The tree has changes outside the lane files of \`${id}\`: ${tree.files.map((f) => `\`${f}\``).join(", ")}. Commit or undo them first. No lane changed for \`${pkg}\`.`,
    );
    return false;
  }
  if (tree.files.length === 0) return true;
  const commit = exec(run, "git", [
    "commit",
    "-m",
    `dotclaude-spec: lanes of ${id}`,
    "--",
    ...mine,
  ]);
  if (commit.code !== 0) run.io.error(commit.out);
  return commit.code === 0;
};

export const mergeCommand = async (
  run: Run,
  args: string[],
): Promise<number> => {
  const [pkg, branch] = args;
  if (!pkg || !branch) {
    run.io.error("Usage: dotclaude-spec merge <package> <branch>");
    return 2;
  }
  if (inLinkedWorktree(run.store.root)) {
    run.io.error(
      "This is a linked git worktree. Only the main checkout merges a package.",
    );
    return 1;
  }
  const id = await changeOf(run, pkg);
  if (id === null) return 1;
  const events = await run.store.events(id);
  const lane = events ? (await run.store.lanes(id, events))[pkg] : undefined;
  if (lane !== "review") {
    run.io.error(
      `The lane of \`${pkg}\` is \`${lane}\`. Only a package in \`review\` merges.`,
    );
    return 1;
  }
  if (!branchUsable(run, branch) || !settleTree(run, id, pkg)) return 1;

  const merge = exec(run, "git", [
    "merge",
    "--no-edit",
    "--end-of-options",
    branch,
  ]);
  if (merge.code !== 0) {
    const files = conflicted(run);
    if (files.length > 0) {
      run.io.error(`The merge of \`${branch}\` has conflicts in these files:`);
      for (const file of files) run.io.error(file);
    } else run.io.error(merge.out);
    return 1;
  }

  if (hasGenerator(run)) {
    const generate = exec(run, "just", ["generate"]);
    if (generate.code !== 0) {
      run.io.error(
        `\`just generate\` failed after the merge of \`${branch}\`. The lane of \`${pkg}\` is the same.`,
      );
      run.io.error(generate.out);
      return 1;
    }
  }
  const moved = await moveLane(run, pkg, "done");
  if (moved !== 0) return moved;
  const paths = [
    ...(run.store.exists(GENERATED_DIR) ? [GENERATED_DIR] : []),
    ...storeFiles(id),
  ];
  exec(run, "git", ["add", "--", ...paths]);
  const commit = exec(run, "git", [
    "commit",
    "-m",
    `dotclaude-spec: \`${pkg}\` done after the merge of \`${branch}\``,
    "--",
    ...paths,
  ]);
  if (commit.code !== 0) {
    run.io.error(commit.out);
    return 1;
  }
  return 0;
};
