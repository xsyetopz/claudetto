// The width of the glyphs of the status line: an emoji with default emoji presentation takes two columns,
// and a symbol with text presentation takes one.

import { expect, test } from "bun:test";
import { width } from "../../../src/plugins/claudetto/slices/statusline/width.ts";

test("an emoji with default emoji presentation takes two columns", () => {
  for (const glyph of ["⚡", "✅", "⭐", "❌", "✨", "⛔", "🚀"]) {
    expect(width(glyph)).toBe(2);
  }
});

test("a symbol with text presentation takes one column", () => {
  for (const glyph of [
    "✎",
    "◷",
    "✦",
    "▲",
    "▼",
    "⎇",
    "⌂",
    "◈",
    "▤",
    "◔",
    "●",
    "◆",
    "☺",
  ]) {
    expect(width(glyph)).toBe(1);
  }
});
