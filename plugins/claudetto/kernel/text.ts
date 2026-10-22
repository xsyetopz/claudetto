// Small text tests that more than one feature uses. This file has no import.

/**
 * The count of lines in `text`.
 * A final newline does not start a line.
 */
export const lineCount = (text: string): number =>
  text === "" ? 0 : text.split("\n").length - (text.endsWith("\n") ? 1 : 0);

/**
 * `text` as one line: each line break becomes ` · `, and empty lines go.
 * A `ui.log` line of Claude Code draws a line break as a bad glyph (D5).
 */
export const oneLine = (text: string): string =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .join(" · ");
