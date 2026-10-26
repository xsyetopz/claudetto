// The brace expansion of bash and zsh (`{a,b}` and `{1..3}`), for `scan.ts`.

import { BRACE_WORDS_MAX } from "../limits.ts";

/** A character of a word, with `brace` true when it is an unquoted brace or comma, and `lit` true when it is a plain `$` of the scan. */
type Char = { c: string; brace: boolean; lit: boolean };

/** A word of the expansion, with the offsets in it of the plain `$` that the source word had. */
export type Expanded = { text: string; lits: number[] };

type Group = { close: number; items: Char[][] };

const SEQUENCE = /^(-?\d+|[A-Za-z])\.\.(-?\d+|[A-Za-z])(?:\.\.(-?\d+))?$/;

const plain = (text: string): Char[] =>
  text.split("").map((c) => ({ c, brace: false, lit: false }));

const join = (w: Char[]): string => w.map((ch) => ch.c).join("");

/** A number with a leading zero pads each number to the widest of the two ends. */
const padOf = (numeric: boolean, a: string, b: string): number =>
  numeric && [a, b].some((n) => /^-?0\d/.test(n))
    ? Math.max(a.length, b.length)
    : 0;

/** The words of the sequence `from..to` or `from..to..step`, or null when `body` is not one. */
const sequence = (body: string): string[] | null => {
  const m = SEQUENCE.exec(body);
  if (!m) return null;
  const [, a = "", b = "", s] = m;
  const numeric = /\d/.test(a);
  if (numeric !== /\d/.test(b)) return null;
  const from = numeric ? Number(a) : a.charCodeAt(0);
  const to = numeric ? Number(b) : b.charCodeAt(0);
  const step = (to < from ? -1 : 1) * (Math.abs(Number(s ?? 1)) || 1);
  const pad = padOf(numeric, a, b);
  const out: string[] = [];
  for (let n = from; step > 0 ? n <= to : n >= to; n += step) {
    if (out.length > BRACE_WORDS_MAX) break;
    out.push(numeric ? String(n).padStart(pad, "0") : String.fromCharCode(n));
  }
  return out;
};

/** The comma items of the group, or else the words of a sequence. */
const closeGroup = (w: Char[], open: number, cuts: number[], close: number) => {
  if (cuts.length > 1)
    return {
      close,
      items: [...cuts, close]
        .slice(1)
        .map((cut, k) => w.slice((cuts[k] as number) + 1, cut)),
    };
  const words = sequence(join(w.slice(open + 1, close)));
  return words && { close, items: words.map(plain) };
};

/** The end and the items of the brace group that opens at `w[open]`, or null when it is not a group. */
const groupAt = (w: Char[], open: number): Group | null => {
  let depth = 0;
  const cuts = [open];
  for (let j = open + 1; j < w.length; j++) {
    const { c, brace } = w[j] as Char;
    if (!brace) continue;
    if (c === "{") depth++;
    else if (c === "}" && depth > 0) depth--;
    else if (c === "," && depth === 0) cuts.push(j);
    else if (c === "}") return closeGroup(w, open, cuts, j);
  }
  return null;
};

/** Adds the words of `w` to `out`, the first group first, until `out` has more than `BRACE_WORDS_MAX` words. */
const expand = (w: Char[], out: Expanded[]): void => {
  if (out.length > BRACE_WORDS_MAX) return;
  for (let open = 0; open < w.length; open++) {
    const { c, brace } = w[open] as Char;
    const group = brace && c === "{" ? groupAt(w, open) : null;
    if (!group) continue;
    const head = w.slice(0, open);
    const tail = w.slice(group.close + 1);
    for (const item of group.items) expand([...head, ...item, ...tail], out);
    return;
  }
  out.push({
    text: join(w),
    lits: w.flatMap((ch, k) => (ch.lit ? [k] : [])),
  });
};

/**
 * The words that the shell makes from `word` by brace expansion: `{git,reset}` gives `git` and `reset`.
 * `marks` holds the index of each unquoted `{`, `,`, and `}` of `word`, because a quoted one does not expand.
 * `lits` holds the index of each plain `$` of `word`, and each result word has the offsets of those `$` in it.
 * A word that gives more than `BRACE_WORDS_MAX` words gives `[""]`, the unreadable word.
 */
export const expandBraces = (
  word: string,
  marks: number[],
  lits: readonly number[] = [],
): Expanded[] => {
  const at = new Set(marks);
  const out: Expanded[] = [];
  expand(
    word
      .split("")
      .map((c, i) => ({ c, brace: at.has(i), lit: lits.includes(i) })),
    out,
  );
  return out.length > BRACE_WORDS_MAX ? [{ text: "", lits: [] }] : out;
};
