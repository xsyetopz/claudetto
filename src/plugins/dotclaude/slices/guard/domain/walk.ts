// The simple commands of a `Bash` text, as words, for the matchers of `matchers/`.
// `parse` reads the shell, and `stripWrappers` removes the wrapper words.
// This file also unwraps the commands that run another command: `git -C` and `git -c`, and `find -exec` or `-execdir`.
// The words of each command start with its base name, and `dir` is the folder of `git -C` when one is set.
// The matchers never parse the text on their own.

import { parse } from "../../../../../kernel/shell.ts";
import { baseName, stripWrappers } from "../../../../../kernel/wrappers.ts";

/** One simple command: its words, and the folder that `git -C` set for it. */
export type Simple = { words: string[]; dir: string | undefined };

/** The options of `git` that take the next word as their value. */
const GIT_VALUES = new Set([
  "-C",
  "-c",
  "--git-dir",
  "--work-tree",
  "--namespace",
]);

/** The folder of `next`, under `base` when `next` is relative. */
const joinDir = (base: string | undefined, next: string): string =>
  base === undefined || next.startsWith("/") ? next : `${base}/${next}`;

/** The words of `git` after its global options, with the folder of the last `-C`. */
const gitOf = (argv: string[], dir: string | undefined): Simple => {
  let rest = argv.slice(1);
  let folder = dir;
  while (rest.length && (rest[0] as string).startsWith("-")) {
    const opt = rest[0] as string;
    if (opt === "-C") folder = joinDir(folder, rest[1] ?? "");
    rest = rest.slice(GIT_VALUES.has(opt) ? 2 : 1);
  }
  return { words: ["git", ...rest], dir: folder };
};

/** The commands of `find` that run under `-exec` or `-execdir`, up to the `;` or `+` that ends each one. */
const execOf = (rest: string[], dir: string | undefined): Simple[] => {
  const out: Simple[] = [];
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] !== "-exec" && rest[i] !== "-execdir") continue;
    let end = i + 1;
    while (end < rest.length && rest[end] !== ";" && rest[end] !== "+") end++;
    out.push(...unwrap(rest.slice(i + 1, end), dir));
    i = end;
  }
  return out;
};

/** The simple commands of `argv`, with each wrapper removed and each nested command read. */
const unwrap = (argv: string[], dir: string | undefined): Simple[] => {
  const [head, ...rest] = stripWrappers(argv);
  if (head === undefined) return [];
  const name = baseName(head);
  if (name === "git") return [gitOf([name, ...rest], dir)];
  if (name === "find") return [{ words: ["find", ...rest], dir }, ...execOf(rest, dir)];
  return [{ words: [name, ...rest], dir }];
};

/** The simple commands of a `Bash` text, after `parse` and the unwrapping of each wrapper. */
export const walk = (command: string): Simple[] =>
  parse(command).commands.flatMap((argv) => unwrap(argv, undefined));
