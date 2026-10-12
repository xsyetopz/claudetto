// The failure lines of the output of a command, cut to the bounds of the slice.

import {
  FAILURE_LINE,
  MAX_FAILURE_LINES,
  MAX_LINE_CHARS,
  TAIL_LINES,
} from "../limits.ts";

/** The lines to print for a failed command, and the count of lines that the bound left out. */
export interface Failures {
  readonly lines: readonly string[];
  readonly omitted: number;
}

/** The lines of `output` with no trailing blanks, and without the blank lines. */
export const nonBlankLines = (output: string): string[] =>
  output
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.trim() !== "");

/** The line, cut to `MAX_LINE_CHARS` when it is longer. */
export const cut = (line: string): string =>
  line.length > MAX_LINE_CHARS
    ? `${line.slice(0, MAX_LINE_CHARS - 3)}...`
    : line;

/**
 * The lines of `output` that show a failure, at most `MAX_FAILURE_LINES`.
 * When no line matches, the last `TAIL_LINES` lines stand for them, because a failed command must show a reason.
 */
export const failureLines = (output: string): Failures => {
  const all = nonBlankLines(output);
  const hits = all.filter((line) => FAILURE_LINE.test(line));
  const chosen = hits.length > 0 ? hits : all.slice(-TAIL_LINES);
  return {
    lines: chosen.slice(0, MAX_FAILURE_LINES).map(cut),
    omitted: Math.max(0, chosen.length - MAX_FAILURE_LINES),
  };
};
