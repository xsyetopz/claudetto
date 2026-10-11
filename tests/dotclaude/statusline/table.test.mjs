// Tests of the exact context breakdown from the newest `/context` table of the transcript (design D33, task 12.15).

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { stripVTControlCharacters } from "node:util";
import {
  lastTable,
  parseTable,
  partsOf,
  readTable,
} from "../../../plugins/dotclaude/features/statusline/context-table.mjs";
import { TABLE_TAIL_BYTES_MAX } from "../../../plugins/dotclaude/features/statusline/limits.mjs";
import { render } from "../../../plugins/dotclaude/features/statusline/render.mjs";
import { CONTEXT_BLOCK_MARGIN } from "../../../plugins/dotclaude/lib/budget.mjs";
import { tmpDir } from "../../support/repo.mjs";

/** The text of a `/context` record, as Claude Code 2.1.296 writes it (the labels are in the 2.1.296 bundle, and the sample is from a transcript of 2026-10-09). */
const context = (memory) => `## Context Usage

**Model:** claude-opus-5-5
**Tokens:** 11.1k / 300k (4%)

### Estimated usage by category

| Category | Tokens | Percentage |
|----------|--------|------------|
| System prompt | 2k | 0.7% |
| System tools | 5.7k | 1.9% |
| System tools (deferred) | 16.9k | 5.6% |
| Custom agents | 486 | 0.2% |
| Memory files | ${memory} | 0.5% |
| Skills | 1.4k | 0.5% |
| Messages | 10 | 0.0% |
| Compact buffer | 3k | 1.0% |
| Free space | 285.9k | 95.3% |

### Memory Files

| Type | Path | Tokens |
|------|------|--------|
| Project | /work/app/CLAUDE.md | 9k |
`;
const line = (o) => `${JSON.stringify(o)}\n`;
const record = (content, extra = {}) =>
  line({ type: "user", message: { role: "user", content }, ...extra });
const prompt = line({ type: "user", message: { content: "fix the test" } });
const tmp = () => tmpDir("dc-table");

test("table: the fixed parts are exact, and the deferred tools are not a part", () => {
  assert.deepEqual(parseTable(context("1.6k")), {
    system: 2000 + 5700,
    memory: 1600,
    skills: 486 + 1400,
  });
  assert.equal(parseTable("fix the test"), null);
  assert.equal(parseTable(undefined), null);
});

test("table: the messages are the current total minus the fixed parts", () => {
  const table = parseTable(context("1.6k"));
  assert.deepEqual(partsOf(40_000, 300_000, table), {
    free: 300_000 - CONTEXT_BLOCK_MARGIN - 40_000,
    exact: true,
    system: 7700,
    memory: 1600,
    skills: 1886,
    messages: 40_000 - 7700 - 1600 - 1886,
  });
  const data = {
    model: { id: "claude-opus-5-5" },
    context_window: {
      total_input_tokens: 40_000,
      context_window_size: 300_000,
    },
  };
  const text = stripVTControlCharacters(
    render(data, { now: 0, columns: 200, table }),
  );
  assert.ok(text.includes("☰ 2k"), text);
  assert.ok(text.includes("⊛ 8k"), text);
  assert.doesNotMatch(text, /[⊛☰✦] ~/);
});

test("no table: the transcript gives `null`, and only the free tokens are known", () => {
  assert.equal(lastTable(prompt.split("\n")), null);
  // A table in a side thread is not the context of the main thread.
  assert.equal(
    lastTable(record(context("1k"), { isSidechain: true }).split("\n")),
    null,
  );
  const dir = tmp();
  try {
    const file = path.join(dir, "t.jsonl");
    fs.writeFileSync(file, prompt);
    assert.equal(readTable({ session_id: "s1", transcript_path: file }), null);
    assert.equal(readTable({ session_id: "s1" }), null);
    assert.equal(
      readTable({ transcript_path: path.join(dir, "missing") }),
      null,
    );
    assert.deepEqual(partsOf(84_000, 300_000, null), {
      free: 300_000 - CONTEXT_BLOCK_MARGIN - 84_000,
    });
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});

test("newest table wins: a later table replaces an earlier one at each call, with no kept state", () => {
  assert.equal(
    lastTable(
      (record(context("1.6k")) + prompt + record(context("2.5k"))).split("\n"),
    ).memory,
    2500,
  );
  const dir = tmp();
  try {
    const file = path.join(dir, "t.jsonl");
    const input = { session_id: "s2", transcript_path: file };
    fs.writeFileSync(file, record(context("1.6k")) + prompt);
    assert.equal(readTable(input).memory, 1600);
    fs.appendFileSync(file, record(context("2.5k")));
    assert.equal(readTable(input).memory, 2500);
    // A transcript without a table gives `null` again: nothing from the earlier call is kept.
    fs.writeFileSync(file, prompt);
    assert.equal(readTable(input), null);
    assert.deepEqual(fs.readdirSync(dir), ["t.jsonl"]);
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});

test("tail: a table before the tail bound is not read, and a record cut by the bound is skipped", () => {
  const dir = tmp();
  try {
    const file = path.join(dir, "t.jsonl");
    const filler = line({
      type: "user",
      message: { content: "x".repeat(1000) },
    });
    fs.writeFileSync(
      file,
      record(context("1.6k")) +
        filler.repeat(Math.ceil(TABLE_TAIL_BYTES_MAX / filler.length) + 1),
    );
    assert.equal(readTable({ transcript_path: file }), null);
    fs.appendFileSync(file, record(context("2.5k")));
    assert.equal(readTable({ transcript_path: file }).memory, 2500);
    // An unfinished last record has no valid JSON, so the table before it stays.
    fs.appendFileSync(file, record(context("9k")).slice(0, 40));
    assert.equal(readTable({ transcript_path: file }).memory, 2500);
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});
