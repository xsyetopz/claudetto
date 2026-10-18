// The join of two blockquotes that only a blank line separates (`MD028`), in the file of a handoff.

import { expect, test } from "bun:test";
import { joinQuotes } from "../../../plugins/claudetto/slices/handoff/domain/compact.ts";

test("a blank line between two quoted lines becomes a `>` line", () => {
  expect(joinQuotes("> one\n\n> two\n")).toBe("> one\n>\n> two\n");
  expect(joinQuotes("- a\n  > one\n\n\n  > two")).toBe(
    "- a\n  > one\n  >\n  > two",
  );
});

test("a blank line between a quote and other text stays", () => {
  expect(joinQuotes("> one\n\ntext\n\n> two")).toBe("> one\n\ntext\n\n> two");
});
