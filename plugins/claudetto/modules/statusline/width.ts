// The width of text in terminal columns, and a cut to a width. A color sequence has no width.
import { ICON } from "./icons.ts";

const SPLIT = new RegExp(`(${String.fromCharCode(27)}\\[[0-9;]*m)`);

export const plainText = (text: string): string => Bun.stripANSI(text);

export const width = (text: string): number => Bun.stringWidth(text);

/** `text` cut to `max` columns with `…` last. A reset closes the cut text, so no color leaks. */
export const truncate = (text: string, max: number): string => {
  if (width(text) <= max) return text;
  if (max <= 0) return "";
  let out = "";
  let columns = 0;
  let colored = false;
  // The odd parts are the color sequences.
  for (const [index, part] of text.split(SPLIT).entries()) {
    if (index % 2 === 1) {
      out += part;
      colored = part !== "\u001b[0m";
      continue;
    }
    for (const char of part) {
      columns += width(char);
      if (columns > max - 1)
        return `${out}${ICON.ellipsis}${colored ? "\u001b[0m" : ""}`;
      out += char;
    }
  }
  return out;
};
