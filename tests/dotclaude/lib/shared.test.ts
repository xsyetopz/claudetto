// Tests of the shared helpers `parseModel`, `windowOf`, `readTail`, `lineCount`, and `isMarkdown`.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
  CONTEXT_WINDOW,
  windowOf,
} from "../../../plugins/dotclaude/lib/budget.ts";
import { parseModel } from "../../../plugins/dotclaude/lib/model.ts";
import { readTail } from "../../../plugins/dotclaude/lib/tail.ts";
import { isMarkdown, lineCount } from "../../../plugins/dotclaude/lib/text.ts";
import { tmpDir } from "../../support/repo.ts";

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

test("`readTail` returns the end of a file and says when it cut the start", async () => {
  const dir = tmpDir("tail");
  try {
    const file = path.join(dir, "t.txt");
    await Bun.write(file, "abc\ndef\n");
    expect(await readTail(file, 100)).toStrictEqual({
      text: "abc\ndef\n",
      truncated: false,
    });
    expect(await readTail(file, 4)).toStrictEqual({
      text: "def\n",
      truncated: true,
    });
    expect(await readTail(path.join(dir, "absent.txt"), 4)).toBe(null);
    expect(await readTail(dir, 4)).toBe(null);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("`lineCount` does not count the line after a final newline", () => {
  expect(lineCount("")).toBe(0);
  expect(lineCount("a")).toBe(1);
  expect(lineCount("a\n")).toBe(1);
  expect(lineCount("a\nb")).toBe(2);
});

test("`isMarkdown` accepts Markdown paths only", () => {
  expect(isMarkdown("docs/A.md")).toBe(true);
  expect(isMarkdown("a.MDX")).toBe(true);
  expect(isMarkdown("a.mjs")).toBe(false);
  expect(isMarkdown(undefined)).toBe(false);
});
