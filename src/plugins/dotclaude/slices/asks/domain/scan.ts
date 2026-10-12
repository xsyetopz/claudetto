// A small reader of code text for the ask on a weaker check, as pure functions.
// It finds a statement, and it gives the statement in a normal form,
// so that a format change (spaces, line breaks, a trailing comma, quote marks) does not change the statement.
// It reads no type, so it works for TypeScript, JavaScript, Python, Rust, Go, and similar text.

import { STATEMENT_MAX_CHARS } from "../limits.ts";

/** The lines of `text` with each comment cut off. `hash` is true for a language where `#` starts a comment. */
export const uncommented = (text: string, hash: boolean): string =>
  text
    .split("\n")
    .filter((line) => !/^\s*(?:\/\*|\*)/.test(line))
    .map((line) => {
      let quote: string | null = null;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i] as string;
        if (quote) {
          if (ch === "\\") i++;
          else if (ch === quote) quote = null;
        } else if (ch === '"' || ch === "`") quote = ch;
        else if (ch === "'" && line.indexOf("'", i + 1) !== -1) quote = ch;
        else if (ch === "/" && line[i + 1] === "/") return line.slice(0, i);
        else if (
          hash &&
          ch === "#" &&
          (i === 0 || /\s/.test(line[i - 1] ?? ""))
        )
          return line.slice(0, i);
      }
      return line;
    })
    .join("\n");

/** True when a statement goes on after a line break: the line ends with an operator, or the next line starts with one. */
const goesOn = (text: string, at: number): boolean => {
  const head = text.slice(0, at).trimEnd();
  const rest = text.slice(at).trimStart();
  return /[+\-*/,=|&?:(]$/.test(head) || /^[.+\-*|&?:]/.test(rest);
};

/**
 * The statement that starts at `from`: the text up to the end of the statement.
 * A statement ends at a `;`, at a line break outside brackets that no operator continues, or at a closer with no opener.
 * A quote opens a string that the scan skips. The statement has at most `STATEMENT_MAX_CHARS` characters.
 */
export const statementAt = (text: string, from: number): string => {
  let depth = 0;
  const stop = Math.min(text.length, from + STATEMENT_MAX_CHARS);
  for (let i = from; i < stop; i++) {
    const ch = text[i] as string;
    if (ch === '"' || ch === "'" || ch === "`") {
      for (i++; i < stop && text[i] !== ch; i++) if (text[i] === "\\") i++;
    } else if ("([{".includes(ch)) depth++;
    else if (")]}".includes(ch)) {
      if (depth === 0) return text.slice(from, i);
      depth--;
    } else if (depth === 0 && ch === ";") return text.slice(from, i);
    else if (depth === 0 && ch === "\n" && !goesOn(text, i))
      return text.slice(from, i);
  }
  return text.slice(from, stop);
};

/** The normal form of a statement: no space, no trailing comma, and one kind of quote mark. */
export const normal = (statement: string): string =>
  statement
    .replace(/\s+/g, "")
    .replace(/,+(?=[)\]}])/g, "")
    .replace(/['`]/g, '"');

/** The items of `was` that `now` does not hold, as a multiset: an item that `now` holds fewer times counts for the rest. */
export const missing = (was: string[], now: string[]): string[] => {
  const left = new Map<string, number>();
  for (const item of now) left.set(item, (left.get(item) ?? 0) + 1);
  return was.filter((item) => {
    const n = left.get(item) ?? 0;
    if (n) left.set(item, n - 1);
    return n === 0;
  });
};
