// `dotclaude-spec merge <package> [<branch>] [--json]`: merges the work of an `approved` package and moves it to `done`.
// With a branch, the head of the branch must be the approved SHA. Then the command runs, in this order:
//   1. The store files of the change are committed. The tree must hold no other change.
//   2. `git merge --no-edit <branch>`. On a conflict the command stops, moves no state, and prints the conflicted files.
//   3. `just generate`, when the project has a `justfile`.
//   4. The `done` event, and one commit of `plugins/` and the folder of the change.
// With no branch, `HEAD` of the main checkout must contain the approved SHA, and the command runs only steps 1, 3, and 4.

import path from "node:path";
import { gateMerge } from "../domain/gates.ts";
import { hasTransition, PACKAGE_TRANSITIONS } from "../domain/states.ts";
import { parseArgs } from "./args.ts";
import { changeDir } from "./files.ts";
import { exec } from "./git.ts";
import type { Run } from "./run.ts";
import {
  movePackage,
  printMoved,
  stop,
  targetOf,
  usage,
} from "./transition.ts";

const USAGE = "Usage: dotclaude-spec merge <package> [<branch>] [--json]";

const GENERATED_DIR = "plugins";

/** Runs git with `args` in the root of the store. */
const git = (run: Run, args: string[]) => exec(run.store.root, "git", args);

/** The tracked files that differ from `HEAD`, relative to the root of the store, and whether any change is staged. */
const treeState = (run: Run): { staged: boolean; files: string[] } => {
  const prefix = git(run, ["rev-parse", "--show-prefix"]).out;
  const status = git(run, [
    "status",
    "--porcelain",
    "-z",
    "--untracked-files=no",
  ]);
  const tokens = status.stdout.split("\0").filter((t) => t !== "");
  const tree = { staged: false, files: [] as string[] };
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

/** The SHA of the commit that `branch` names, or null with a message when `branch` is not a commit the merge can use. */
const branchHead = (run: Run, branch: string): string | null => {
  if (branch.startsWith("-")) {
    run.io.error(`The branch \`${branch}\` starts with a dash.`);
    return null;
  }
  const verify = git(run, [
    "rev-parse",
    "--verify",
    "--quiet",
    "--end-of-options",
    `${branch}^{commit}`,
  ]);
  if (verify.code !== 0) {
    run.io.error(`The branch \`${branch}\` is not a commit.`);
    return null;
  }
  const current = git(run, ["symbolic-ref", "--quiet", "--short", "HEAD"]);
  if (current.code === 0 && current.out === branch) {
    run.io.error(`The branch \`${branch}\` is the current branch.`);
    return null;
  }
  return verify.out;
};

/** Commits the folder of the change when it holds the only changes. Gives false with a message when the merge must not start. */
const settleTree = (run: Run, id: string, pkg: string): boolean => {
  const tree = treeState(run);
  const dir = changeDir(id);
  const others = tree.files.filter((f) =>
    path.posix.relative(dir, f).startsWith(".."),
  );
  if (tree.staged || others.length > 0) {
    run.io.error(
      `The tree has changes outside \`${dir}\`: ${tree.files.map((f) => `\`${f}\``).join(", ")}. Commit or undo them first. No state changed for \`${pkg}\`.`,
    );
    return false;
  }
  if (tree.files.length === 0) return true;
  git(run, ["add", "--", dir]);
  const commit = git(run, [
    "commit",
    "-m",
    `dotclaude-spec: states of ${id}`,
    "--",
    dir,
  ]);
  if (commit.code !== 0) run.io.error(commit.out);
  return commit.code === 0;
};

export const mergeCommand = async (
  run: Run,
  args: string[],
): Promise<number> => {
  const parsed = parseArgs(args);
  if (typeof parsed === "string") return usage(run, parsed);
  const [pkg, branch, extra] = parsed.words;
  if (!pkg || extra !== undefined) return usage(run, USAGE);
  const target = await targetOf(run, pkg, "merges a package");
  if (target === null) return 1;
  const { id, events, state } = target;
  const step = { from: state, command: "merge", to: "done" } as const;
  if (!hasTransition(PACKAGE_TRANSITIONS, step))
    return stop(
      run,
      `The package \`${pkg}\` is \`${state}\`. Only an \`approved\` package merges.`,
    );
  const sha =
    events.findLast((e) => e.package === pkg && e.verdict === "approve")?.sha ??
    "";
  const head = branch === undefined ? undefined : branchHead(run, branch);
  if (head === null) return 1;
  const gate = gateMerge({
    approvedSha: sha,
    ...(head === undefined ? {} : { branchHead: head }),
    mainContains:
      sha !== "" &&
      git(run, ["merge-base", "--is-ancestor", sha, "HEAD"]).code === 0,
  });
  if (!gate.ok) return stop(run, gate.reason);
  if (!settleTree(run, id, pkg)) return 1;
  if (branch !== undefined) {
    const merge = git(run, ["merge", "--no-edit", "--end-of-options", branch]);
    if (merge.code !== 0) {
      const files = git(run, ["diff", "--name-only", "--diff-filter=U"])
        .out.split("\n")
        .filter((f) => f !== "");
      if (files.length === 0) run.io.error(merge.out);
      else {
        run.io.error(
          `The merge of \`${branch}\` has conflicts in these files:`,
        );
        for (const file of files) run.io.error(file);
      }
      return 1;
    }
  }
  if (run.store.exists("justfile")) {
    const generate = exec(run.store.root, "just", ["generate"]);
    if (generate.code !== 0) {
      run.io.error(
        `\`just generate\` failed after the merge. The state of \`${pkg}\` is the same.`,
      );
      return stop(run, generate.out);
    }
  }
  const moved = await movePackage(run, id, pkg, "done", { sha });
  const paths = [
    ...(run.store.exists(GENERATED_DIR) ? [GENERATED_DIR] : []),
    changeDir(id),
  ];
  git(run, ["add", "--", ...paths]);
  const commit = git(run, [
    "commit",
    "-m",
    `dotclaude-spec: \`${pkg}\` done${branch === undefined ? "" : ` after the merge of \`${branch}\``}`,
    "--",
    ...paths,
  ]);
  if (commit.code !== 0) return stop(run, commit.out);
  printMoved(run, "merge", moved, parsed.json);
  return 0;
};
