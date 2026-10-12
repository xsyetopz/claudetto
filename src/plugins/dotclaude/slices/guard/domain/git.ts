// The deny of the git commands that change the state of a checkout that other workers share (spec P35, step 4).
// A subagent runs in the checkout of the main session, so its `git stash` or `git reset --hard` breaks the work of the other workers.
// The functions are pure, and `adapters/mod.ts` denies a `Bash` call of a subagent with the reason.

import { commands } from "../../../../../kernel/shell.ts";
import { baseName, stripWrappers } from "../../../../../kernel/wrappers.ts";

/** The options of `git` that take the next word as their value. */
const WITH_VALUE = new Set([
  "-C",
  "-c",
  "--git-dir",
  "--work-tree",
  "--namespace",
]);

/** A pathspec that names a whole folder: `.`, `..`, `*`, `:/`, `:(top)`, or a path that ends in `/`. */
const isWholeFolder = (path: string): boolean =>
  /^(?:\.|\.\.|\*|:\/?|:\(top\))\/?$/.test(path) || path.endsWith("/");

/** The subcommand of `git` in `argv`, with its arguments, or an empty list when `argv` is not `git`. */
const gitArgs = (argv: string[]): string[] => {
  const [head, ...rest] = stripWrappers(argv);
  if (head === undefined || baseName(head) !== "git") return [];
  let i = 0;
  while (i < rest.length && (rest[i] as string).startsWith("-"))
    i += WITH_VALUE.has(rest[i] as string) ? 2 : 1;
  return rest.slice(i);
};

/** True when `checkout` takes a revision and writes a whole folder from it. */
const checkoutWritesFolder = (args: string[]): boolean => {
  const dashes = args.indexOf("--");
  if (dashes >= 0) {
    const revision = args.slice(0, dashes).some((a) => !a.startsWith("-"));
    return revision && args.slice(dashes + 1).some(isWholeFolder);
  }
  const words = args.filter((a) => !a.startsWith("-"));
  return words.length > 1 && words.slice(1).some(isWholeFolder);
};

/** True when `restore` takes a `--source` revision and writes a whole folder from it. */
const restoreWritesFolder = (args: string[]): boolean =>
  args.some((a) => a === "-s" || a.startsWith("--source")) &&
  args.some((a) => !a.startsWith("-") && isWholeFolder(a));

/** True when the `git` command in `argv` changes the state of the shared checkout. */
const changesShared = (argv: string[]): boolean => {
  const [verb, ...args] = gitArgs(argv);
  if (verb === "stash" || verb === "clean") return true;
  if (verb === "reset") return args.includes("--hard");
  if (verb === "checkout") return checkoutWritesFolder(args);
  if (verb === "restore") return restoreWritesFolder(args);
  return false;
};

/**
 * The deny reason of a `Bash` command that changes the state of the shared checkout, or null.
 * The check reads each part of a compound command, and text in quotes is an argument.
 */
export const sharedGitReason = (command: string): string | null =>
  commands(command).some(changesShared)
    ? [
        "This command changes the state of the checkout that other workers share.",
        "A subagent does not run it, because the work of the other workers breaks when it does.",
        "To set your work aside, commit it with `git commit`.",
        "Then continue with your task.",
      ].join("\n")
    : null;
