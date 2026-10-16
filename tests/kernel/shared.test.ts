// Tests of the shared helpers `parseModel`, `windowOf`, `lineCount`, and `isMarkdown`.

import { expect, test } from "bun:test";
import { CONTEXT_WINDOW, windowOf } from "../../src/kernel/budget.ts";
import { parseModel } from "../../src/kernel/model.ts";
import { isMarkdown, lineCount } from "../../src/kernel/text.ts";

test("`parseModel` reads family, major, and minor, and ignores a date suffix", () => {
  expect(parseModel("claude-opus-5-5")).toStrictEqual({
    family: "opus",
    major: 5,
    minor: 5,
  });
  expect(parseModel("claude-haiku-4-5-20251001")).toStrictEqual({
    family: "haiku",
    major: 4,
    minor: 5,
  });
  expect(parseModel("claude-fable-5")).toStrictEqual({
    family: "fable",
    major: 5,
    minor: null,
  });
  expect(parseModel("claude-sonnet-4-20250514")).toStrictEqual({
    family: "sonnet",
    major: 4,
    minor: null,
  });
});

test("`parseModel` marks the family of an unknown model id as `unknown`", () => {
  for (const id of ["claude-unknown-9", "claude-zeta-9-1"])
    expect(parseModel(id)?.family).toBe("unknown");
  expect(parseModel("claude-mythos-5")?.family).toBe("mythos");
});

test("`parseModel` gives null for an id that is not a Claude model id", () => {
  for (const id of ["gpt-4", "opus", "", undefined, null])
    expect(parseModel(id)).toBe(null);
});

test("`windowOf` takes the reported size up to the context window", () => {
  expect(windowOf(200_000)).toBe(200_000);
  expect(windowOf(1_000_000)).toBe(CONTEXT_WINDOW);
  expect(windowOf(0)).toBe(CONTEXT_WINDOW);
  expect(windowOf(undefined)).toBe(CONTEXT_WINDOW);
});

test("`windowOf` gives the context window for a size that is not a finite number above zero", () => {
  expect(windowOf(-1)).toBe(CONTEXT_WINDOW);
  expect(windowOf(Number.NaN)).toBe(CONTEXT_WINDOW);
  expect(windowOf(Number.POSITIVE_INFINITY)).toBe(CONTEXT_WINDOW);
});

test("`lineCount` does not count the line after a final newline", () => {
  expect(lineCount("")).toBe(0);
  expect(lineCount("a\nb")).toBe(2);
  expect(lineCount("a\nb\n")).toBe(2);
});

test("`isMarkdown` accepts Markdown paths only", () => {
  expect(isMarkdown("docs/README.md")).toBe(true);
  expect(isMarkdown("a.MDX")).toBe(true);
  expect(isMarkdown("a.ts")).toBe(false);
  expect(isMarkdown(undefined)).toBe(false);
});
