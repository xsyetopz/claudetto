// The width of text in terminal columns, and a cut to a width.
// An escape sequence has no width. A wide character, such as an emoji or a CJK character, has two columns.

import { ICON } from "./icons.ts";

const ESC = String.fromCharCode(27);
const ESCAPE = new RegExp(`${ESC}\\[[0-9;]*m`, "g");
const SEQUENCE = new RegExp(`^${ESC}\\[[0-9;]*m$`);
const SPLIT = new RegExp(`(${ESC}\\[[0-9;]*m)`);

/** The text without its color sequences. */
export const plainText = (text: string): string => text.replace(ESCAPE, "");

const isWide = (code: number): boolean =>
  (code >= 0x1100 && code <= 0x115f) ||
  (code >= 0x2e80 && code <= 0xa4cf) ||
  (code >= 0xac00 && code <= 0xd7a3) ||
  (code >= 0xf900 && code <= 0xfaff) ||
  (code >= 0xfe30 && code <= 0xfe6f) ||
  (code >= 0xff00 && code <= 0xff60) ||
  (code >= 0xffe0 && code <= 0xffe6) ||
  (code >= 0x1f300 && code <= 0x1faff) ||
  (code >= 0x20000 && code <= 0x3fffd);

const isZero = (code: number): boolean =>
  (code >= 0x300 && code <= 0x36f) ||
  code === 0x200d ||
  (code >= 0xfe00 && code <= 0xfe0f);

/** The columns of one character. */
const columnsOf = (char: string): number => {
  const code = char.codePointAt(0) ?? 0;
  if (isZero(code)) return 0;
  return isWide(code) ? 2 : 1;
};

/** The columns that `text` takes, with its color sequences not counted. */
export const width = (text: string): number => {
  let columns = 0;
  for (const char of plainText(text)) columns += columnsOf(char);
  return columns;
};

/**
 * `text` cut to at most `max` columns, with `…` as its last character when it is cut.
 * A color sequence in the kept part stays, and a reset sequence closes the cut text, so no color leaks.
 */
export const truncate = (text: string, max: number): string => {
  if (width(text) <= max) return text;
  if (max <= 0) return "";
  let out = "";
  let columns = 0;
  let colored = false;
  for (const part of text.split(SPLIT)) {
    if (SEQUENCE.test(part)) {
      out += part;
      colored = part !== "\u001b[0m";
      continue;
    }
    for (const char of part) {
      const next = columnsOf(char);
      if (columns + next > max - 1)
        return `${out}${ICON.ellipsis}${colored ? "\u001b[0m" : ""}`;
      out += char;
      columns += next;
    }
  }
  return out;
};
