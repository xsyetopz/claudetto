// Tests of the shared helpers `parseModel` and `lineCount`.

import { expect, test } from "bun:test";
import { lineCount } from "../../../plugins/claudetto/kernel/text.ts";
import { parseModel } from "../../../plugins/claudetto/modules/statusline/model.ts";

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

test("`lineCount` does not count the line after a final newline", () => {
  expect(lineCount("")).toBe(0);
  expect(lineCount("a\nb")).toBe(2);
  expect(lineCount("a\nb\n")).toBe(2);
});
