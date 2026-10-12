// Tests of the `sembr` formatter (spec semantic-line-breaks).

import { expect, test } from "bun:test";
import { sembr } from "../../../src/plugins/dotclaude/slices/sembr/domain/split.ts";

test("splits after a sentence end", () => {
  expect(sembr("Read the file. Then edit it! Why? Because.")).toBe(
    "Read the file.\nThen edit it!\nWhy?\nBecause.",
  );
});

test("keeps abbreviations, initials, and version numbers", () => {
  for (const text of [
    "Use a tool, e.g. Bun for tests.",
    "That is, i.e. node and bun",
    "Use A. Smith as the name",
    "It is version 1.2. Next",
    "Tools vs. Hooks stay apart",
    "Apples, etc. Pears",
  ])
    expect(sembr(text)).toBe(text);
});

test("keeps code fences, front matter, tables, headings, and definitions", () => {
  const text = [
    "---",
    "title: A. B",
    "---",
    "# Head. Two",
    "```js",
    "a(). B()",
    "```",
    "| a. B | c. D |",
    "| --- | --- |",
    "| e. F | g. H |",
    "[ref]: http://x.y/z. Q",
  ].join("\n");
  expect(sembr(text)).toBe(text);
});

test("keeps hard-break lines, inline code, links, and URLs", () => {
  for (const text of [
    "End one. End two  ",
    "End one. End two\\",
    "Run `a. B` now",
    "See [a. B](http://x.y/a. B) now",
    "See http://x.y/a.Z now",
    "See <http://x.y/a. B> now",
  ])
    expect(sembr(text)).toBe(text);
  expect(sembr("Run `x`. Then `y`.")).toBe("Run `x`.\nThen `y`.");
});

test("keeps the list indent and the quote prefix", () => {
  expect(sembr("- One. Two.\n  Three. Four.")).toBe(
    "- One.\n  Two.\n  Three.\n  Four.",
  );
  expect(sembr("1. One. Two.")).toBe("1. One.\n   Two.");
  expect(sembr("> One. Two.")).toBe("> One.\n> Two.");
  expect(sembr("> - One. Two.")).toBe("> - One.\n>   Two.");
});

test("never joins lines and is idempotent", () => {
  const text = [
    "A short line",
    "that goes on. And splits.",
    "",
    "Plain text",
    "",
    "    Indented. Code",
    "Last one!",
  ].join("\n");
  const once = sembr(text);
  expect(sembr(once)).toBe(once);
  expect(
    once.split("\n").length >= text.split("\n").length,
    `${once.split("\n").length}`,
  ).toBeTruthy();
  expect(once.includes("    Indented. Code"), once).toBeTruthy();
});
