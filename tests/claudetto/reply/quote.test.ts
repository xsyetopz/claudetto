// Tests of the `>` quote of the `reply` slice.

import { expect, test } from "bun:test";
import { quoteOf } from "../../../src/plugins/claudetto/slices/reply/adapters/mod.ts";
import { QUOTE_MAX_LINES } from "../../../src/plugins/claudetto/slices/reply/limits.ts";

test("`quoteOf` starts each line with `>` and ends with a blank line", () => {
  expect(quoteOf("a\n\nb\n")).toBe("> a\n>\n> b\n\n");
});

test("`quoteOf` keeps only the first `QUOTE_MAX_LINES` lines", () => {
  const text = Array.from({ length: QUOTE_MAX_LINES + 5 }, (_, i) => `l${i}`);
  expect(quoteOf(text.join("\n")).split("\n").length).toBe(QUOTE_MAX_LINES + 2);
});
