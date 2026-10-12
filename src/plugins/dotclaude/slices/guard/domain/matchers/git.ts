// The literal matchers of `git` and of the `.git` folder. Each entry has a catalog id, examples, and a `match` on the words of one command.
// The tier of each id is in `index.ts`, and `git.shared-checkout` applies only in a subagent.

import {
  hasFlag,
  isWholeFolder,
  isForce,
  positionals,
  splitDashes,
  isRecursive,
} from "./args.ts";
import type { Ctx, Matcher } from "./types.ts";

/** The options of `checkout` that take a value. */
const CHECKOUT_VALUES = ["-b", "-B", "--orphan", "--conflict"];
/** The options of `restore` that take a value. */
const RESTORE_VALUES = ["-s", "--source"];
/** The options of `stash` that take a value. */
const STASH_VALUES = ["-m", "--message"];
/** The branches that a force push must not change. */
const DEFAULT_BRANCHES = new Set(["main", "master"]);

/** The paths of `checkout` or `restore`: the words after `--`, or each word when there is no `--`. */
const pathsOf = (args: string[], values: string[]): string[] => {
  const { before, after } = splitDashes(args);
  return after ?? positionals(before, values);
};

/** True when one path of `paths` names a whole folder. */
const anyWholeFolder = async (
  paths: string[],
  ctx: Ctx,
): Promise<boolean> => {
  for (const p of paths) if (await isWholeFolder(p, ctx)) return true;
  return false;
};

/** True when `restore` writes the working tree: `--staged` alone only changes the index. */
const writesWorktree = (args: string[]): boolean =>
  !hasFlag(args, "--staged", "-S") || hasFlag(args, "--worktree", "-W");

/** True when `checkout` moves `HEAD` to another branch or revision, and does not write one file. */
const switchesBranch = async (args: string[], ctx: Ctx): Promise<boolean> => {
  const { before, after } = splitDashes(args);
  if (after !== null || hasFlag(args, "-b", "-B", "--orphan")) return false;
  const [target] = positionals(before, CHECKOUT_VALUES);
  return target !== undefined && (await ctx.kind(target)) !== "file";
};

/** The action of `stash`: `push`, `save`, `drop`, and others, or `undefined` for a plain `git stash`. */
const stashAction = (args: string[]): string | undefined =>
  positionals(args, STASH_VALUES)[0];

/** The host of a push target: `+main`, `HEAD:main`, and `refs/heads/main` all read as `main`. */
const destOf = (word: string): string =>
  word.replace(/^\+/, "").split(":").pop()?.replace(/^refs\/heads\//, "") ?? "";

/** True when `path` is the `.git` folder of a repository. */
const isGitDir = (path: string): boolean => {
  const t = path.replace(/\/+$/, "");
  return t === ".git" || t.endsWith("/.git");
};

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
    ],
    match: async (words, ctx) => {
      const [name, verb, ...args] = words;
      if (name !== "git") return false;
      if (verb === "reset") return args.includes("--hard");
      if (verb === "switch")
        return hasFlag(args, "-f", "--force", "--discard-changes");
      if (verb === "checkout")
        return (
          hasFlag(args, "-f", "--force") ||
          (await anyWholeFolder(pathsOf(args, CHECKOUT_VALUES), ctx))
        );
      if (verb === "restore")
        return (
          writesWorktree(args) &&
          (await anyWholeFolder(pathsOf(args, RESTORE_VALUES), ctx))
        );
      return false;
    },
  },
  {
    id: "git.clean",
    examples: ["git clean -fd", "git clean -f", "git clean --force -d", "git clean -xdf"],
    match: async (words) => {
      const [name, verb, ...args] = words;
      return name === "git" && verb === "clean" && isForce(args);
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
    ],
    match: async (words) => {
      const [name, verb, ...args] = words;
      if (name !== "git" || verb !== "push") return false;
      const forced =
        args.some((a) => a === "-f" || a.startsWith("--force")) ||
        args.some((a) => a.startsWith("+"));
      return (
        forced &&
        positionals(args).some((w) => DEFAULT_BRANCHES.has(destOf(w)))
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
    id: "git.delete-repo",
    examples: [
      "rm -rf .git",
      "rm -fr ./.git",
      "rm -r -f .git/",
      "rm --recursive --force .git",
    ],
    match: async (words) => {
      const [name, ...args] = words;
      return (
        name === "rm" &&
        isRecursive(args) &&
        isForce(args) &&
        positionals(args).some(isGitDir)
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
      "git checkout HEAD~1",
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
      if (verb === "checkout") return switchesBranch(args, ctx);
      return false;
    },
  },
];
