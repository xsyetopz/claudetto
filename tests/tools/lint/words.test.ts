// The Title Case of a heading (`titleCase`): the rule of D52 and the list of minor words that the hook and the markdownlint rule share.

import { expect, test } from "bun:test";
import {
  MINOR_WORDS,
  titleCase,
} from "../../../src/plugins/claudetto/slices/sembr/domain/title.ts";

test.each([
  ["What I need from you", "What I Need from You"],
  ["the end of the road", "The End of the Road"],
  ["Look in", "Look In"],
  ["Set up: a plan for it", "Set Up: A Plan for It"],
  ["Read-only add-on", "Read-Only Add-On"],
  ["Use of `bun` on iOS", "Use of `bun` on iOS"],
  ["Phase A and B", "Phase A and B"],
  ["end-to-end and out-of-scope", "End-To-End and Out-Of-Scope"],
  ["see [the docs](url)", "See [the Docs](url)"],
  ["D25. an eval must fail", "D25. An Eval Must Fail"],
])("`%s` becomes `%s`", (from, to) => {
  expect(titleCase(from)).toBe(to);
});

test("the minor words hold the articles, the conjunctions, and the prepositions", () => {
  for (const w of ["a", "the", "and", "or", "of", "with", "between", "to"])
    expect(MINOR_WORDS.has(w)).toBe(true);
  expect(MINOR_WORDS.has("is")).toBe(false);
});
