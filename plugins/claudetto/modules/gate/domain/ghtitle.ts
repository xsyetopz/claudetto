// The Chicago Title Case of the `--title` of `gh pr create` and `gh issue create` (task 10.11).
// A title changes only when its value is one plain literal: a single-quoted text, or a double-quoted or bare text with no `$`, backtick, or backslash.

import { titleCase } from "../../../kernel/text.ts";

type Span = { start: number; end: number; raw: string };
type Edit = { start: number; end: number; text: string };

/** A word (quoted runs, escapes, and plain characters) or one operator character. */
const WORD_OR_OPERATOR =
  /(?:'[^']*'|"(?:[^"\\]|\\[\s\S])*"|\\[\s\S]|[^\s'"\\;|&<>()])+|[;|&<>()\n]/g;

/** The top-level words of `text` by part. A part ends at an operator outside quotes. */
const parts = (text: string): Span[][] => {
  const result: Span[][] = [[]];
  for (const m of text.matchAll(WORD_OR_OPERATOR)) {
    const start = m.index ?? 0;
    if (m[0].length === 1 && /[;|&<>()\n]/.test(m[0])) result.push([]);
    else result.at(-1)?.push({ start, end: start + m[0].length, raw: m[0] });
  }
  return result;
};

/** The text of a plain literal word with its quote, or `undefined` for a word that the shell can expand. */
const literal = (raw: string): { text: string; quote: string } | undefined => {
  const quote = raw.charAt(0);
  const text = raw.slice(1, -1);
  const closed = raw.length > 1 && raw.endsWith(quote);
  if (quote === "'" && closed && !text.includes("'")) return { text, quote };
  if (quote === '"' && closed && !/["$`\\]/.test(text)) return { text, quote };
  return /^[^\s'"$`\\*?[\]{}~!#]+$/.test(raw)
    ? { text: raw, quote: "" }
    : undefined;
};

/** The edit of the value word `raw` at `start`, or `undefined` when the value is not a plain literal or has the right case. */
const editOf = (start: number, raw: string): Edit | undefined => {
  const value = literal(raw);
  const fixed = value && titleCase(value.text);
  return value && fixed !== value.text
    ? {
        start,
        end: start + raw.length,
        text: value.quote + fixed + value.quote,
      }
    : undefined;
};

/** The edit of a `--title` or `-t` flag `word`, with the word `next` after it. */
const flagEdit = (word: Span, next: Span | undefined): Edit | undefined => {
  const inline = /^(--title=|-t=)(.*)$/s.exec(word.raw);
  if (inline)
    return editOf(word.start + (inline[1] ?? "").length, inline[2] ?? "");
  return (word.raw === "--title" || word.raw === "-t") && next
    ? editOf(next.start, next.raw)
    : undefined;
};

/** `command` with the `--title` and `-t` value of each `gh pr create` and `gh issue create` call in Chicago Title Case, or `undefined` when nothing changes. */
export const fixTitles = (command: string): string | undefined => {
  const edits = parts(command)
    .filter((w) => w[0]?.raw === "gh" && w[2]?.raw === "create")
    .filter((w) => ["pr", "issue"].includes(w[1]?.raw ?? ""))
    .flatMap((words) => words.map((word, i) => flagEdit(word, words[i + 1])))
    .filter((edit): edit is Edit => edit !== undefined);
  if (edits.length === 0) return undefined;
  return edits
    .sort((a, b) => b.start - a.start)
    .reduce(
      (text, e) => text.slice(0, e.start) + e.text + text.slice(e.end),
      command,
    );
};
