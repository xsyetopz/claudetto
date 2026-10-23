// Small text tests that more than one feature uses. No import.

/** The count of lines in `text`. A final newline does not start a line. */
export const lineCount = (text: string): number =>
  text === "" ? 0 : text.split("\n").length - (text.endsWith("\n") ? 1 : 0);

/** `text` as one line, because a `ui.log` line draws a line break as a bad glyph (D5): breaks become ` · ` and empty lines go. */
export const oneLine = (text: string): string =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .join(" · ");

/** The JSON value of `text`, or `null` when it does not parse. */
export const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};
