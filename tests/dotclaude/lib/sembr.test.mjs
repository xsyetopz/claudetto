// Tests of the `sembr` formatter (spec semantic-line-breaks).

import assert from "node:assert/strict";
import { test } from "node:test";
import { sembr } from "../../../plugins/dotclaude/lib/sembr.mjs";

test("splits after a sentence end", () => {
  assert.equal(
    sembr("Read the file. Then edit it! Why? Because."),
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
    assert.equal(sembr(text), text);
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
  assert.equal(sembr(text), text);
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
    assert.equal(sembr(text), text);
  assert.equal(sembr("Run `x`. Then `y`."), "Run `x`.\nThen `y`.");
});

test("keeps the list indent and the quote prefix", () => {
  assert.equal(
    sembr("- One. Two.\n  Three. Four."),
    "- One.\n  Two.\n  Three.\n  Four.",
  );
  assert.equal(sembr("1. One. Two."), "1. One.\n   Two.");
  assert.equal(sembr("> One. Two."), "> One.\n> Two.");
  assert.equal(sembr("> - One. Two."), "> - One.\n>   Two.");
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
  assert.equal(sembr(once), once);
  assert.ok(
    once.split("\n").length >= text.split("\n").length,
    `${once.split("\n").length}`,
  );
  assert.ok(once.includes("    Indented. Code"), once);
});
