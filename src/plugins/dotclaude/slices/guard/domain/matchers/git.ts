// The literal matchers of `git` and of the `.git` folder. Each entry has a catalog id, examples, and a `match` on the words of one command.
// The tier of each id is in `index.ts`, and `git.shared-checkout` applies only in a subagent.
// A branch switch there is denied only when the working directory is the main checkout (`ctx.isMainCheckout`).

import {
  hasFlag,
  hasShort,
  isForce,
  isPathspec,
  isWholeFolder,
  positionals,
  splitDashes,
} from "./args.ts";
import type { Ctx, Matcher } from "./types.ts";

/** A subcommand word of `git` that the hook can read: letters, digits, and dashes only. */
const LITERAL = /^[A-Za-z][\w-]*$/;

/** The options of `checkout` that take a value. */
const CHECKOUT_VALUES = ["-b", "-B", "--orphan", "--conflict"];
/** The options of `restore` that take a value. */
const RESTORE_VALUES = ["-s", "--source"];
/** The options of `stash` that take a value. */
const STASH_VALUES = ["-m", "--message"];
/** The branches that a force push must not change. */
const DEFAULT_BRANCHES = new Set(["main", "master"]);

/** The paths of `restore`: the words after `--`, or each word when there is no `--`. */
const restorePaths = (args: string[]): string[] => {
  const { before, after } = splitDashes(args);
  return after ?? positionals(before, RESTORE_VALUES);
};

/**
 * The paths of `checkout`: the words after `--`.
 * With no `--`, git reads the first word as a revision, so it is a path only when its form is a pathspec, such as `.` or a glob.
 */
const checkoutPaths = (args: string[]): string[] => {
  const { before, after } = splitDashes(args);
  if (after !== null) return after;
  const [first, ...rest] = positionals(before, CHECKOUT_VALUES);
  return first !== undefined && isPathspec(first) ? [first, ...rest] : rest;
};

/** True when one path of `paths` names a whole folder. */
const anyWholeFolder = async (paths: string[], ctx: Ctx): Promise<boolean> => {
  for (const p of paths) if (await isWholeFolder(p, ctx)) return true;
  return false;
};

/** True when `restore` writes the working tree: `--staged` alone only changes the index. */
const writesWorktree = (args: string[]): boolean =>
  !hasFlag(args, "--staged", "-S") || hasFlag(args, "--worktree", "-W");

/** True when `checkout` or `switch` moves `HEAD` to another branch, and does not write one file. */
const switchesBranch = async (
  verb: string,
  args: string[],
  ctx: Ctx,
): Promise<boolean> => {
  if (verb === "switch") return true;
  const { before, after } = splitDashes(args);
  if (after !== null) return false;
  if (hasFlag(args, "-b", "-B", "--orphan")) return true;
  const [target] = positionals(before, CHECKOUT_VALUES);
  return target !== undefined && (await ctx.kind(target)) !== "file";
};

/** The action of `stash`: `push`, `save`, `drop`, and others, or `undefined` for a plain `git stash`. */
const stashAction = (args: string[]): string | undefined =>
  positionals(args, STASH_VALUES)[0];

/** The host of a push target: `+main`, `HEAD:main`, and `refs/heads/main` all read as `main`. */
const destOf = (word: string): string =>
  word
    .replace(/^\+/, "")
    .split(":")
    .pop()
    ?.replace(/^refs\/heads\//, "") ?? "";

export const gitMatchers: Matcher[] = [
  {
    id: "git.discard-uncommitted",
    examples: [
      "git reset --hard",
      "git reset HEAD --hard",
      "git checkout -- .",
      "git checkout HEAD~1 -- .",
      "git checkout v1.0.0 -- ./",
      "git checkout HEAD~1 -- src/",
      "git checkout HEAD~1 .",
      "git checkout -f main",
      "git checkout --force main",
      "git restore .",
      "git restore --source=HEAD~1 .",
      "git restore -s HEAD~1 ./",
      "git switch -f main",
      "git switch --discard-changes main",
      "git rm -rf .",
      "git rm -r -f src/",
      "git $(echo reset) --hard",
    ],
    match: async (words, ctx) => {
      const [name, verb, ...args] = words;
      if (name !== "git") return false;
      // The hook cannot read a subcommand that a substitution wrote, so it denies that call (the word is `""` or a variable).
      if (verb !== undefined && !LITERAL.test(verb)) return true;
      if (verb === "reset") return args.includes("--hard");
      if (verb === "switch")
        return hasFlag(args, "-f", "--force", "--discard-changes");
      if (verb === "checkout")
        return (
          hasFlag(args, "-f", "--force") ||
          (await anyWholeFolder(checkoutPaths(args), ctx))
        );
      if (verb === "restore")
        return (
          writesWorktree(args) &&
          (await anyWholeFolder(restorePaths(args), ctx))
        );
      // A forced `rm` drops the uncommitted work of its paths. `--cached` only unstages them.
      if (verb === "rm") return isForce(args) && !hasFlag(args, "--cached");
      return false;
    },
  },
  {
    id: "git.clean",
    examples: [
      "git clean -fd",
      "git clean -f",
      "git clean --force -d",
      "git clean -xdf",
    ],
    match: async (words) => {
      const [name, verb, ...args] = words;
      // A dry run only lists the files, so `-n` and `--dry-run` make the clean allowed.
      const dryRun = hasShort(args, "n") || hasFlag(args, "--dry-run");
      return name === "git" && verb === "clean" && isForce(args) && !dryRun;
    },
  },
  {
    id: "git.stash-drop",
    examples: ["git stash drop", "git stash clear", "git stash drop stash@{0}"],
    match: async (words) => {
      const [name, verb, ...args] = words;
      return (
        name === "git" &&
        verb === "stash" &&
        ["drop", "clear"].includes(stashAction(args) ?? "")
      );
    },
  },
  {
    id: "git.history-rewrite",
    examples: [
      "git reflog expire --expire=now --all",
      "git gc --prune=now",
      "git filter-branch --index-filter cmd HEAD",
    ],
    match: async (words) => {
      const [name, verb, ...args] = words;
      if (name !== "git") return false;
      if (verb === "reflog") return args[0] === "expire";
      if (verb === "gc") return args.includes("--prune=now");
      return verb === "filter-branch";
    },
  },
  {
    id: "git.force-push-default",
    examples: [
      "git push --force origin main",
      "git push -f origin master",
      "git push --force-with-lease origin main",
      "git push origin +main",
      "git push -fu origin main",
    ],
    match: async (words) => {
      const [name, verb, ...args] = words;
      if (name !== "git" || verb !== "push") return false;
      // `-f` may sit in a cluster, such as `-fu`. A force push with no branch, such as `git push --force`, is not denied here: the classifier covers it.
      const forced =
        isForce(args) ||
        args.some((a) => a.startsWith("--force")) ||
        args.some((a) => a.startsWith("+"));
      return (
        forced && positionals(args).some((w) => DEFAULT_BRANCHES.has(destOf(w)))
      );
    },
  },
  {
    id: "git.delete-branch",
    examples: ["git branch -D feature", "git branch --delete --force feature"],
    match: async (words) => {
      const [name, verb, ...args] = words;
      return (
        name === "git" &&
        verb === "branch" &&
        (args.includes("-D") ||
          (hasFlag(args, "--delete", "-d") && hasFlag(args, "--force", "-f")))
      );
    },
  },
  {
    id: "git.shared-checkout",
    examples: [
      "git stash",
      "git stash push -m wip",
      "git stash save wip",
      "git stash pop",
      "git stash apply",
      "git worktree remove --force ../wt",
      "git checkout main",
      "git checkout -b feature",
      "git switch -c feature",
    ],
    match: async (words, ctx) => {
      const [name, verb, ...args] = words;
      if (name !== "git") return false;
      if (verb === "stash")
        return !["list", "show", "drop", "clear"].includes(
          stashAction(args) ?? "",
        );
      if (verb === "worktree")
        return args[0] === "remove" && hasFlag(args, "--force", "-f");
      if (verb === "checkout" || verb === "switch")
        return (
          (await switchesBranch(verb, args, ctx)) &&
          (await ctx.isMainCheckout())
        );
      return false;
    },
  },
];
