// The simple commands of a `Bash` text, as words, for the matchers of `matchers/`.
// `parse` reads the shell, and `stripWrappers` removes the wrapper words.
// This file also unwraps the commands that run another command: `git -C` and `git -c`, and `find -exec` or `-execdir`.
// The words of each command start with its base name, and `dir` is the folder of `git -C` when one is set.
// The matchers never parse the text on their own.

import { parse } from "../../../../../kernel/shell.ts";
import { baseName, stripWrappers } from "../../../../../kernel/wrappers.ts";
import { isAbsPath } from "./matchers/norm.ts";
import { gitVerbAt } from "./matchers/words.ts";

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
  base === undefined || isAbsPath(next) ? next : `${base}/${next}`;

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

/** The folder that each `-C` in `words` sets, under `dir`, for a command whose name is unreadable. */
const cFolder = (
  words: string[],
  dir: string | undefined,
): string | undefined =>
  words.reduce<string | undefined>(
    (folder, w, i) =>
      w === "-C" ? joinDir(folder, words[i + 1] ?? "") : folder,
    dir,
  );

/**
 * The command whose name a substitution wrote, read as `git` when a git verb follows it (see `gitVerbAt`).
 * The words before the verb are dropped, and their `-C` folder is kept, as for `git`.
 */
const unreadableOf = (rest: string[], dir: string | undefined): Simple[] => {
  const at = gitVerbAt(["", ...rest]);
  if (at < 0) return [{ words: ["", ...rest], dir }];
  return [
    {
      words: ["git", ...rest.slice(at - 1)],
      dir: cFolder(rest.slice(0, at - 1), dir),
    },
  ];
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
  if (head === "") return unreadableOf(rest, dir);
  const name = baseName(head);
  if (name === "git") return [gitOf([name, ...rest], dir)];
  if (name === "find")
    return [{ words: ["find", ...rest], dir }, ...execOf(rest, dir)];
  return [{ words: [name, ...rest], dir }];
};

/**
 * The operand of a `cd` command, or null when `argv` is not a `cd`.
 * An empty operand, or `-`, gives `undefined`: the folder is then unknown, and the working directory stands.
 */
const cdOf = (argv: string[]): { dir: string | undefined } | null => {
  const [head, ...rest] = stripWrappers(argv);
  if (head === undefined || baseName(head) !== "cd") return null;
  const operand = rest.find((w) => !w.startsWith("-")) ?? "";
  return { dir: operand === "" || operand === "-" ? undefined : operand };
};

/** A character that marks where bash splits a word, at an unquoted `$IFS`. */
const SEP = "\u0000";

/**
 * An `$IFS` reference, or a `${...}` expansion that names `IFS`, which bash may expand to a separator.
 * It is sticky, so it matches only at the position that `lastIndex` sets.
 */
const IFS_REF = /\$\{[^}]*IFS[^}]*\}|\$IFS(?![A-Za-z0-9_])/y;

/**
 * The text of `command`, with each `$IFS` reference replaced by `SEP`.
 * A quoted reference stays as it is, because bash does not split inside quotes.
 * With `all`, a quoted reference is also replaced, which is the reading of a shell that runs the text again.
 */
const markedText = (command: string, all: boolean): string => {
  let out = "";
  let quote: string | null = null;
  for (let i = 0; i < command.length; i++) {
    const c = command[i] as string;
    if (c === "\\" && quote !== "'") {
      out += command.slice(i, i + 2);
      i++;
      continue;
    }
    if (c === "$" && (all || quote === null)) {
      IFS_REF.lastIndex = i;
      const ref = IFS_REF.exec(command);
      if (ref) {
        out += SEP;
        i += ref[0].length - 1;
        continue;
      }
    }
    if (quote === null && (c === "'" || c === '"')) quote = c;
    else if (c === quote) quote = null;
    out += c;
  }
  return out;
};

/** The words of each parsed command, with each `SEP` read as a separator that splits a word. */
const commandsOf = (text: string): string[][] =>
  parse(text).commands.map((argv) =>
    argv.flatMap((w) =>
      w.includes(SEP) ? w.split(SEP).filter((part) => part !== "") : [w],
    ),
  );

/** `name=value` in an `alias` word. */
const ALIAS_DEF = /^([A-Za-z_][\w.-]*)=(.*)$/;

/** The aliases of a text, by name, with the words of each body. */
type Aliases = Map<string, string[]>;

/**
 * Applies an `alias` or `unalias` command to `aliases`, and returns true when `argv` is one of them.
 * `unalias -a` drops every alias.
 */
const aliasCmd = (argv: string[], aliases: Aliases): boolean => {
  if (argv[0] === "alias") {
    for (const word of argv.slice(1)) {
      const [, name = "", value = ""] = ALIAS_DEF.exec(word) ?? [];
      if (name !== "")
        aliases.set(
          name,
          value.split(/\s+/).filter((w) => w !== ""),
        );
    }
    return true;
  }
  if (argv[0] !== "unalias") return false;
  if (argv.includes("-a")) aliases.clear();
  for (const word of argv.slice(1)) aliases.delete(word);
  return true;
};

/**
 * The words of `argv` with its head replaced by the alias of that name, again while the new head is an alias.
 * A name that is met twice stops the chain, as bash stops it.
 */
const expandAlias = (argv: string[], aliases: Aliases): string[] => {
  let words = argv;
  const seen = new Set<string>();
  while (
    words[0] !== undefined &&
    aliases.has(words[0]) &&
    !seen.has(words[0])
  ) {
    seen.add(words[0]);
    words = [...(aliases.get(words[0]) as string[]), ...words.slice(1)];
  }
  return words;
};

/**
 * The simple commands of `text` as the shell reads them, with `cd` setting the folder.
 * The words are the ones that are written, so an alias does not change them here.
 */
const rawOf = (text: string): Simple[] => {
  const out: Simple[] = [];
  let dir: string | undefined;
  for (const argv of commandsOf(text)) {
    const cd = cdOf(argv);
    if (cd) {
      dir = cd.dir === undefined ? undefined : joinDir(dir, cd.dir);
      continue;
    }
    out.push(...unwrap(argv, dir));
  }
  return out;
};

/**
 * The simple commands of `text` with each alias expanded, from its definition on.
 * Bash expands an alias only from the next line, so `alias g=git; g reset --hard` runs `g` as a command
 * that is not found. This reading does not wait for the line end, so the same-line form is also denied.
 * A deny of the same-line form is the safe side, because the raw words above still hold each written verb.
 */
const expandedOf = (text: string): Simple[] => {
  const out: Simple[] = [];
  const aliases: Aliases = new Map();
  let dir: string | undefined;
  for (const argv of commandsOf(text)) {
    if (aliasCmd(argv, aliases)) continue;
    const words = expandAlias(argv, aliases);
    const cd = cdOf(words);
    if (cd) {
      dir = cd.dir === undefined ? undefined : joinDir(dir, cd.dir);
      continue;
    }
    if (words !== argv) out.push(...unwrap(words, dir));
  }
  return out;
};

/**
 * The simple commands of a `Bash` text, after `parse` and the unwrapping of each wrapper.
 * A `cd` sets the folder of the commands after it, so `cd <dir> && rm ...` reads `rm` under `<dir>`.
 * Each command is read as it is written, and again with its aliases expanded when the text sets one.
 * A text with a `$IFS` is read with the quoted split too, because a nested shell reads a quoted text as code.
 */
export const walk = (command: string): Simple[] => {
  const out: Simple[] = [];
  const seen = new Set<string>();
  for (const all of [false, true]) {
    const text = markedText(command, all);
    if (seen.has(text)) continue;
    seen.add(text);
    out.push(...rawOf(text));
    if (command.includes("alias")) out.push(...expandedOf(text));
  }
  return out;
};
