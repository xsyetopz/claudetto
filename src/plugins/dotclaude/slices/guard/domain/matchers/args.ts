// The argument readers of the matchers: the options, the positional words, the paths, and the `rm` flags.
// The functions are pure, and each matcher gets the words of its command from `walk.ts`.

import type { Ctx } from "./types.ts";

/** True when `args` has one of the `names`, such as `--force`. */
export const hasFlag = (args: readonly string[], ...names: string[]): boolean =>
  args.some((a) => names.includes(a));

/** True when `args` has a short-option cluster, such as `-fd`, with one of the `letters`. */
export const hasShort = (args: readonly string[], letters: string): boolean =>
  args.some(
    (a) => /^-[a-zA-Z]+$/.test(a) && [...letters].some((l) => a.includes(l)),
  );

/** The words of `args` that are not options, with the values of the options in `values` removed. */
export const positionals = (
  args: readonly string[],
  values: readonly string[] = [],
): string[] => {
  const out: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i] as string;
    if (a === "--") return [...out, ...args.slice(i + 1)];
    if (values.includes(a)) i++;
    else if (!a.startsWith("-")) out.push(a);
  }
  return out;
};

/** The words before `--`, and the words after it, which are `null` when there is no `--`. */
export const splitDashes = (
  args: readonly string[],
): { before: string[]; after: string[] | null } => {
  const at = args.indexOf("--");
  return at < 0
    ? { before: [...args], after: null }
    : { before: args.slice(0, at), after: args.slice(at + 1) };
};

const MAGIC = /[*?[\]]/;

/** True when a pathspec names a whole folder: `.`, `..`, a glob, pathspec magic, or an existing folder. */
export const isWholeFolder = async (
  path: string,
  ctx: Ctx,
): Promise<boolean> => {
  if (path.startsWith(":") || MAGIC.test(path) || /^\.\.?\/?$/.test(path))
    return true;
  return (await ctx.kind(path)) === "folder";
};

/** The path without a trailing `/*` or `/`, so `/*`, `/`, and `/usr/` read as `""`, `""`, and `/usr`. */
export const trimmed = (word: string): string =>
  word.replace(/\/\*$/, "").replace(/\/+$/, "");

/** True when `args` makes `rm` or `chmod` recurse: `-r`, `-R`, or `--recursive`. */
export const isRecursive = (args: readonly string[]): boolean =>
  hasShort(args, "rR") || hasFlag(args, "--recursive");

/** True when `args` forces: `-f` in a cluster, or `--force`. */
export const isForce = (args: readonly string[]): boolean =>
  hasShort(args, "f") || hasFlag(args, "--force");
