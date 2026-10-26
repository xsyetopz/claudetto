// The variables of a simple command, for `shell.ts`: the literal values that the same text assigned to a name, and the program word and script that they build.
// A name has a set of values: a plain assignment replaces the values of the plain sequence, and an assignment in a branch, a loop, a function, or a subshell adds a value.

import { SHELL_VARIANTS_MAX } from "../limits.ts";
import type { Spots } from "./scan.ts";
import { wordSet } from "./shellkinds.ts";
import { baseName, stripWrappers, words } from "./wrappers.ts";

/** The values of a name: `now` after the plain sequence, `later` from the assignments that may not have run, and `ever` for each value that the name got anywhere in the text. A value of `undefined` is a value that the gate cannot read. */
type Possible = {
  now: Set<string | undefined>;
  later: Set<string | undefined>;
  ever: Set<string | undefined>;
};

/** The variables of a text with a literal value. A name that is not here has no known value. */
export type Vars = Map<string, Possible>;

/** A text that the variables filled in, one text for each combination of values, and whether a part stayed unknown. */
export type Filled = { texts: string[]; unknown: boolean };

/** The stand-in for a `$` that is plain text (in single quotes or after a backslash) while `emit` fills the names of a command. A word cannot hold a NUL, so the stand-in is never a word character. */
const LIT = "\0";

/** `word` with the `$` at `offsets` (the plain `$` of `scan`) replaced by `LIT`, so no fill reads them as names. */
export const mask = (
  word: string,
  offsets: readonly number[] | undefined,
): string =>
  offsets
    ? [...word].map((c, k) => (offsets.includes(k) ? LIT : c)).join("")
    : word;

/** `word` with each `LIT` back to a `$`. */
export const unmask = (word: string): string => word.replaceAll(LIT, "$");

/** A reference to a variable. A `$` after a backslash is plain text. */
const REFS = /(?<!\\)\$(?:(\w+)|\{(\w+)\})/g;
const ASSIGN = /^(\w+)(\+?)=(.*)$/s;
const READERS = wordSet("read mapfile readarray");
const LOOPS = wordSet("for select");
const DECLARERS = wordSet("export readonly declare typeset local");
/** The deepest chain of program words that a value can open, such as `sudo $X`. */
const CHAIN_MAX = 8;

const UNSETTERS = wordSet("unset");
/** The builtins whose bare name can make a local name, which has no value of the caller. */
const LOCALIZERS = wordSet("declare typeset local");

const setMany = (
  vars: Vars,
  name: string,
  values: (string | undefined)[],
  plain: boolean,
): void => {
  const held = vars.get(name) ?? {
    now: new Set(),
    later: new Set(),
    ever: new Set(),
  };
  for (const value of values) held.ever.add(value);
  if (plain) held.now = new Set(values);
  else for (const value of values) held.later.add(value);
  vars.set(name, held);
};

const set = (
  vars: Vars,
  name: string,
  value: string | undefined,
  plain: boolean,
): void => setMany(vars, name, [value], plain);

/** The values that `name` can have: none for a name that nothing assigned. */
export const valuesOf = (vars: Vars, name: string): (string | undefined)[] => {
  const held = vars.get(name);
  return held ? [...new Set([...held.now, ...held.later])] : [];
};

/** `unset` drops the plain value. `printf -v NAME` and `getopts OPTS NAME` write a value that the gate cannot read. */
const writeNames = (argv: string[], name: string, vars: Vars): void => {
  if (UNSETTERS.has(name))
    for (const w of argv.slice(1).filter((a) => !a.startsWith("-")))
      vars.set(w, {
        now: new Set(),
        later: vars.get(w)?.later ?? new Set(),
        ever: vars.get(w)?.ever ?? new Set(),
      });
  const written = name === "printf" ? argv[argv.indexOf("-v") + 1] : undefined;
  const opted = name === "getopts" ? argv[2] : undefined;
  for (const w of [written, opted])
    if (w !== undefined && w !== "") set(vars, w, undefined, false);
};

/**
 * Records the assignments of `argv` in `vars`: `A=b`, `export A=b`, `readonly`, `declare`.
 * A value with a substitution, a name that `read` sets, and a loop variable have no known value.
 * `plain` is true for a command in the plain sequence of the text, which replaces the values of a name, and false for a command that may not run.
 */
export const assign = (argv: string[], vars: Vars, plain: boolean): void => {
  const name = baseName(argv[0] ?? "");
  if (READERS.has(name))
    for (const w of argv.slice(1)) set(vars, w, undefined, plain);
  if (LOOPS.has(name) && argv[1] !== undefined)
    set(vars, argv[1], undefined, false);
  writeNames(argv, name, vars);
  if (DECLARERS.has(name)) {
    declare(argv, name, vars, plain);
    return;
  }
  const pairs = argv
    .filter((w) => !w.startsWith("-"))
    .map((w) => ASSIGN.exec(w));
  if (pairs.length === 0 || pairs.includes(null)) return;
  for (const m of pairs as RegExpExecArray[]) put(vars, m, false, plain);
};

/** The values of the assignment text `value`: itself, or a copy of each combination of the values of its names. A plain `$` (`LIT`) is not a name, and the value has it back as `$`. */
const copies = (value: string, vars: Vars): (string | undefined)[] => {
  if (!value.includes("$")) return [unmask(value)];
  const { texts, unknown } = fill(value, vars, false);
  return unknown || texts.some((t) => t.includes("$"))
    ? [undefined]
    : texts.map(unmask);
};

/** Sets the name of the match `m` of `ASSIGN`: `NAME+=x` adds a value that the gate cannot read, and so does a value with a substitution or an array. A value with `$NAME` takes each value of the name, and is unreadable when a name has no known value. */
const put = (
  vars: Vars,
  m: RegExpExecArray,
  opaque: boolean,
  plain: boolean,
): void => {
  const [, key, add, value] = m as unknown as [string, string, string, string];
  const unread = opaque || add === "+" || /^\(|`/.test(value);
  const values = unread ? [undefined] : copies(value, vars);
  setMany(vars, key, values, plain && add === "");
};

/**
 * `export`, `readonly`, `declare`, `typeset`, and `local` words.
 * A flag that changes the value (`-i`, `-l`, `-u`, `-a`, `-A`, `-n`) makes it unreadable.
 * `-n` makes a name that points to another name, so both names are unreadable.
 * A bare name of `declare`, `typeset`, or `local` may be a new local name, so it is unreadable.
 */
const declare = (
  argv: string[],
  name: string,
  vars: Vars,
  plain: boolean,
): void => {
  const flags = argv.slice(1).filter((w) => /^[-+]\w/.test(w));
  const opaque = flags.some((w) => /^-\w*[ailuAn]/.test(w));
  const refs = flags.some((w) => /^-\w*n/.test(w));
  for (const w of argv.slice(1).filter((a) => !/^[-+]/.test(a))) {
    const m = ASSIGN.exec(w);
    if (m) {
      put(vars, m, opaque, plain);
      if (refs) set(vars, m[3] as string, undefined, false);
    } else if (LOCALIZERS.has(name) && /^\w+$/.test(w))
      set(vars, w, undefined, false);
  }
};

/** The names that `argv` reads, with the values that they have now, for `drifted`. */
export type Uses = Map<string, Set<string | undefined>>;

/** Notes the values of each name that the words of `argv` read, for a command that is not in the plain sequence. */
export const noteUses = (
  argv: string[],
  vars: Vars,
  uses: Uses,
  plain: boolean,
): void => {
  if (plain) return;
  for (const m of argv.join(" ").matchAll(REFS)) {
    const name = (m[1] ?? m[2]) as string;
    const seen = uses.get(name) ?? new Set();
    for (const v of valuesOf(vars, name)) seen.add(v);
    uses.set(name, seen);
  }
};

/** Sets `unknown` of `result` when a name that a loop or a function read got a value later in the text, which the read did not see. */
export const markDrift = (
  uses: Uses,
  vars: Vars,
  result: { unknown: boolean },
): void => {
  const drifted = [...uses].some(([name, seen]) =>
    [...(vars.get(name)?.ever ?? [])].some((v) => !seen.has(v)),
  );
  if (drifted) result.unknown = true;
};

/**
 * `text` with each `$NAME` and `${NAME}` replaced by each known value of the name.
 * More combinations than `SHELL_VARIANTS_MAX` make the text unknown, and `texts` is then `text`.
 * In a program word (`script` is false), a name with no known value makes the text unknown too.
 * A script keeps such a name and the names `$1`, because its shell sets them, and `parse` judges the program words of the script.
 */
export const fill = (text: string, vars: Vars, script: boolean): Filled => {
  const names = new Set<string>();
  for (const m of text.matchAll(REFS)) names.add((m[1] ?? m[2]) as string);
  let texts = [text];
  for (const name of names) {
    const found = valuesOf(vars, name);
    if (found.length === 0 || found.includes(undefined)) {
      if (script) continue;
      return { texts: [text], unknown: true };
    }
    const ref = new RegExp(
      `(?<!\\\\)(?:\\$\\{${name}\\}|\\$${name}(?!\\w))`,
      "g",
    );
    texts = texts.flatMap((t) =>
      found.map((v) => t.replace(ref, () => v as string)),
    );
    if (texts.length > SHELL_VARIANTS_MAX)
      return { texts: [text], unknown: true };
  }
  return { texts: [...new Set(texts)], unknown: false };
};

/** `script` filled again until the texts stop changing: a value that holds `$NAME` (a copy of a single-quoted text) is read by `eval` with the names at that point. A chain over `CHAIN_MAX` fills is unknown. */
const settle = (script: string, vars: Vars): Filled => {
  let filled = fill(script, vars, true);
  for (let n = 0; n < CHAIN_MAX && !filled.unknown; n++) {
    const next = filled.texts.map((t) => fill(t, vars, true));
    const texts = [...new Set(next.flatMap((r) => r.texts))];
    if (next.some((r) => r.unknown) || texts.length > SHELL_VARIANTS_MAX)
      return { texts: filled.texts, unknown: true };
    if (
      texts.length === filled.texts.length &&
      texts.every((t) => filled.texts.includes(t))
    )
      return filled;
    filled = { texts, unknown: false };
  }
  return { texts: filled.texts, unknown: true };
};

/** The texts that the script `script` of `sh -c` or `eval` can be, and whether it is unknown: it has an unknown variable or a substitution. */
export const scriptTexts = (script: string, vars: Vars): Filled => {
  const filled = settle(script, vars);
  return /[`]|\$\(/.test(script) || script === ""
    ? { texts: filled.texts, unknown: true }
    : filled;
};

/** `argv` with each `$NAME` in the program word replaced by each combination of known values, behind the wrappers that come first. A part that stays unknown makes the program unknown, and `argvs` is then `[argv]`. */
export const resolve = (
  argv: string[],
  vars: Vars,
  depth = 0,
): { argvs: string[][]; unknown: boolean } => {
  const at = argv.length - stripWrappers(argv).length;
  const word = argv[at];
  if (word === undefined || !/[$`]/.test(word))
    return { argvs: [argv], unknown: false };
  const { texts, unknown } = fill(word, vars, false);
  if (unknown || depth >= CHAIN_MAX || texts.some((t) => /[$`]/.test(t)))
    return { argvs: [argv], unknown: true };
  const next = texts.map((t) =>
    resolve(
      [...argv.slice(0, at), ...words(t), ...argv.slice(at + 1)],
      vars,
      depth + 1,
    ),
  );
  const argvs = next.flatMap((r) => r.argvs);
  return argvs.length > SHELL_VARIANTS_MAX
    ? { argvs: [argv], unknown: true }
    : { argvs, unknown: next.some((r) => r.unknown) };
};

/** The fields of the pieces of a word: a piece with `split` breaks at its white space, and the text around it stays in the fields that touch it. */
const fieldsOf = (pieces: { text: string; split: boolean }[]): string[] => {
  const out: string[] = [];
  let current = "";
  for (const { text, split } of pieces) {
    if (!split) current += text;
    else
      for (const [k, part] of text.split(/\s+/).entries()) {
        if (k > 0) {
          out.push(current);
          current = "";
        }
        current += part;
      }
  }
  out.push(current);
  return out.filter(Boolean);
};

/** The words that the word `word` gives: each known value of its variables, and the value of a variable at an offset of `spots` (a `$` outside quotes) split into words. */
const wordsOf = (
  word: string,
  vars: Vars,
  spots: readonly number[] | undefined,
): string[][] | undefined => {
  if (!word.includes("$")) return [[word]];
  if (spots === undefined) {
    const { texts, unknown } = fill(word, vars, true);
    return unknown ? undefined : texts.map((t) => [t]);
  }
  const refs = [...word.matchAll(REFS)];
  let combos: Map<string, string>[] = [new Map()];
  for (const name of new Set(refs.map((m) => (m[1] ?? m[2]) as string))) {
    const found = valuesOf(vars, name);
    // A name with no known value stays in the word, as in `fill` of a script.
    if (found.length === 0 || found.includes(undefined)) continue;
    combos = combos.flatMap((c) =>
      found.map((v) => new Map(c).set(name, v as string)),
    );
    if (combos.length > SHELL_VARIANTS_MAX) return undefined;
  }
  const out = combos.map((combo) => {
    const pieces: { text: string; split: boolean }[] = [];
    let at = 0;
    for (const m of refs) {
      const value = combo.get((m[1] ?? m[2]) as string);
      pieces.push({ text: word.slice(at, m.index), split: false });
      pieces.push({
        text: value ?? m[0],
        split: value !== undefined && spots.includes(m.index),
      });
      at = m.index + m[0].length;
    }
    pieces.push({ text: word.slice(at), split: false });
    return fieldsOf(pieces);
  });
  return [...new Map(out.map((o) => [JSON.stringify(o), o])).values()];
};

/**
 * `argv` with each `$NAME` and `${NAME}` in the words after the program word replaced by each combination of known values.
 * `spots[i]` has the offsets of the `$` outside quotes in word `i`, so a value with spaces gives more words only there.
 * A name with no known value stays in the word, so a delete of `"$file"` is judged as before.
 * More combinations than `SHELL_VARIANTS_MAX` make the command unknown.
 */
export const fillArgs = (
  argv: string[],
  vars: Vars,
  spots: Spots,
): { argvs: string[][]; unknown: boolean } => {
  const at = argv.length - stripWrappers(argv).length;
  if (at < 0) return { argvs: [argv], unknown: false };
  let argvs = [argv.slice(0, at + 1)];
  for (let i = at + 1; i < argv.length; i++) {
    const options = wordsOf(argv[i] as string, vars, spots[i]);
    if (options === undefined) return { argvs: [argv], unknown: true };
    argvs = argvs.flatMap((v) => options.map((o) => [...v, ...o]));
    if (argvs.length > SHELL_VARIANTS_MAX)
      return { argvs: [argv], unknown: true };
  }
  return { argvs, unknown: false };
};
