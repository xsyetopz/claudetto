// Small text tests that more than one feature uses. This file has no import.

/**
 * The count of lines in `text`.
 * A final newline does not start a line.
 *
 * @param {string} text
 */
export const lineCount = (text) =>
  text === "" ? 0 : text.split("\n").length - (text.endsWith("\n") ? 1 : 0);

/**
 * True for a path of a Markdown file.
 * Any value that is not a string is not a path.
 *
 * @param {unknown} file
 */
export const isMarkdown = (file) =>
  typeof file === "string" && /\.mdx?$/i.test(file);
