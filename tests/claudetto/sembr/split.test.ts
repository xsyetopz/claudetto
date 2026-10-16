// Tests of the `sembr` formatter (spec semantic-line-breaks).

import { expect, test } from "bun:test";
import { sembr } from "../../../src/plugins/claudetto/slices/sembr/domain/split.ts";

test("splits after a sentence end", () => {
  expect(sembr("Read the file. Then edit it! Why? Because.")).toBe(
    "Read the file.\nThen edit it!\nWhy?\nBecause.",
  );
});

test("keeps version numbers and a sentence end before a lower case letter", () => {
  for (const text of [
    "It is version 1.2 and 3.4.5 now",
    "Use a tool, e.g. bun for tests.",
    "Tools vs. hooks stay apart",
    "Przykład np. żółw i inne",
  ])
    expect(sembr(text)).toBe(text);
});

test("splits text in other languages and scripts", () => {
  expect(sembr("Żółw śpi. Łódź jest duża. Õun on hea.")).toBe(
    "Żółw śpi.\nŁódź jest duża.\nÕun on hea.",
  );
  expect(sembr("Это раз. Это два! Это три?")).toBe(
    "Это раз.\nЭто два!\nЭто три?",
  );
  expect(sembr("これは文です。次の文です。")).toBe(
    "これは文です。\n次の文です。",
  );
  expect(sembr("I said no. Then I left.")).toBe("I said no.\nThen I left.");
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
