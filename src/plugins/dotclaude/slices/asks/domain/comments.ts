// The code part and the comment part of a line of code, as pure functions.
// A suppression word counts only in a comment, so a word in a string or a regex literal never counts.
// A skipped test counts only in code, so the same word in a string, a regex literal, or a comment never counts.

/** True when `line[i]` can start a regex literal: the last code character before it is an operator or an opener. */
const regexStart = (line: string, i: number): boolean => {
  if (/[/*]/.test(line[i + 1] ?? "")) return false;
  const before = line.slice(0, i).trimEnd();
  return before === "" || /[(,=:[!&|?{};]$/.test(before);
};

/** The index after the regex literal that starts at `from`, or -1 when the line holds no closing `/`. */
const regexEnd = (line: string, from: number): number => {
  let inClass = false;
  for (let i = from + 1; i < line.length; i++) {
    if (line[i] === "\\") i++;
    else if (line[i] === "[") inClass = true;
    else if (line[i] === "]") inClass = false;
    else if (line[i] === "/" && !inClass) return i + 1;
  }
  return -1;
};

/**
 * Splits `line` into `{ code, comment }`.
 * `code` is the text before the first comment marker (`//`, `/*`, or `#`), with the text inside each string and regex literal removed.
 * `comment` is the text from that marker to the end, or "" when the line has no comment.
 * A marker inside a quoted string does not count.
 * A `#[` or `#![` at the start of a line is a Rust attribute and not a comment.
 * A line that starts with `*` is the middle of a block comment, so the whole line is the comment.
 * The scan is per line, so a string that spans lines can hide a comment (the check then asks less, never more).
 */
export const splitLine = (line: string): { code: string; comment: string } => {
  if (/^\s*\*/.test(line)) return { code: "", comment: line };
  let code = "";
  let quote: string | null = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i] as string;
    if (quote) {
      if (ch === "\\") i++;
      else if (ch === quote) {
        quote = null;
        code += ch;
      }
    } else if (ch === '"' || ch === "`") {
      quote = ch;
      code += ch;
    } else if (ch === "'" && line.indexOf("'", i + 1) !== -1) {
      quote = ch;
      code += ch;
    } else if (ch === "/" && regexStart(line, i) && regexEnd(line, i) !== -1) {
      code += "//";
      i = regexEnd(line, i) - 1;
    } else if (
      ch === "#" &&
      code.trim() === "" &&
      /^#!?\[/.test(line.slice(i))
    ) {
      code += ch;
    } else if (ch === "#" || (ch === "/" && /[/*]/.test(line[i + 1] ?? ""))) {
      return { code, comment: line.slice(i) };
    } else {
      code += ch;
    }
  }
  return { code, comment: "" };
};

/** The comment part of `line` (see `splitLine`). */
export const commentPart = (line: string): string => splitLine(line).comment;

/** The code part of `line` (see `splitLine`). */
export const codePart = (line: string): string => splitLine(line).code;
