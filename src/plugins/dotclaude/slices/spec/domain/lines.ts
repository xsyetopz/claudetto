// The line helpers of the Markdown parsers: each line keeps its 1-based number.
// Plain data and pure functions only.

import type { FormatError, Result } from "./formats.ts";

export interface Line {
  text: string;
  line: number;
}

export const toLines = (text: string): Line[] =>
  text.split("\n").map((raw, i) => ({
    text: raw.replace(/\r$/, ""),
    line: i + 1,
  }));

/** The text of one group of a match, or `""` when the group did not take part. */
export const group = (m: RegExpExecArray, i: number): string => m[i] ?? "";

export const fail = (line: number, message: string): FormatError => ({
  line,
  message,
});

/** Gives the value, or the errors sorted by line. */
export const result = <T>(
  value: T,
  errors: FormatError[],
): Result<T, FormatError> =>
  errors.length === 0
    ? { ok: true, value }
    : { ok: false, errors: [...errors].sort((a, b) => a.line - b.line) };
