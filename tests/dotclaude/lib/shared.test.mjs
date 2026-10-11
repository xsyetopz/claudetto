// Tests of the shared helpers `parseModel`, `windowOf`, `readTail`, `lineCount`, and `isMarkdown`.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import {
  CONTEXT_WINDOW,
  windowOf,
} from "../../../plugins/dotclaude/lib/budget.mjs";
import { parseModel } from "../../../plugins/dotclaude/lib/model.mjs";
import { readTail } from "../../../plugins/dotclaude/lib/tail.mjs";
import { isMarkdown, lineCount } from "../../../plugins/dotclaude/lib/text.mjs";
import { tmpDir } from "../../support/repo.mjs";

test("`parseModel` reads family, major, and minor, and ignores a date suffix", () => {
  assert.deepEqual(parseModel("claude-opus-5-5"), {
    family: "opus",
    major: 5,
    minor: 5,
  });
  assert.deepEqual(parseModel("claude-haiku-4-5-20251001"), {
    family: "haiku",
    major: 4,
    minor: 5,
  });
  assert.deepEqual(parseModel("claude-fable-5"), {
    family: "fable",
    major: 5,
    minor: null,
  });
  assert.deepEqual(parseModel("claude-sonnet-4-20250514"), {
    family: "sonnet",
    major: 4,
    minor: null,
  });
});

test("`parseModel` gives null for an id that is not a Claude model id", () => {
  for (const id of ["gpt-4", "opus", "", undefined, null])
    assert.equal(parseModel(id), null);
});

test("`windowOf` takes the reported size up to the context window", () => {
  assert.equal(windowOf(200_000), 200_000);
  assert.equal(windowOf(1_000_000), CONTEXT_WINDOW);
  assert.equal(windowOf(0), CONTEXT_WINDOW);
  assert.equal(windowOf(undefined), CONTEXT_WINDOW);
});

test("`readTail` returns the end of a file and says when it cut the start", () => {
  const dir = tmpDir("tail");
  try {
    const file = path.join(dir, "t.txt");
    fs.writeFileSync(file, "abc\ndef\n");
    assert.deepEqual(readTail(file, 100), {
      text: "abc\ndef\n",
      truncated: false,
    });
    assert.deepEqual(readTail(file, 4), { text: "def\n", truncated: true });
    assert.equal(readTail(path.join(dir, "absent.txt"), 4), null);
    assert.equal(readTail(dir, 4), null);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("`lineCount` does not count the line after a final newline", () => {
  assert.equal(lineCount(""), 0);
  assert.equal(lineCount("a"), 1);
  assert.equal(lineCount("a\n"), 1);
  assert.equal(lineCount("a\nb"), 2);
});

test("`isMarkdown` accepts Markdown paths only", () => {
  assert.equal(isMarkdown("docs/A.md"), true);
  assert.equal(isMarkdown("a.MDX"), true);
  assert.equal(isMarkdown("a.mjs"), false);
  assert.equal(isMarkdown(undefined), false);
});
