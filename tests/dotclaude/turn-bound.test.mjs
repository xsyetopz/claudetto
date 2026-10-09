// The turn bound of a subagent: the count of turns in the transcript, `maxTurns` of the agent file,
// and the one note at `TURNS_LEFT_AT` turns left (task 10.9).
// The reads are fakes, so no test reads a real transcript.

import { expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { decide } from "../../plugins/dotclaude/features/context/cli.mjs";
import {
  HAIKU_CONTEXT_MAX,
  TURNS_LEFT_AT,
} from "../../plugins/dotclaude/features/context/limits.mjs";
import {
  countTurns,
  maxTurnsOf,
} from "../../plugins/dotclaude/features/context/turns.mjs";

const AGENTS = path.join(import.meta.dirname, "../../plugins/dotclaude/agents");
const MODEL = "claude-haiku-5-5";
/** The `maxTurns` of the `test-runner` agent file and of the `implementer` agent file. */
const LIMIT = maxTurnsOf("test-runner");
const LONG = maxTurnsOf("implementer");

/** `n` assistant rows with distinct ids and a small context. */
const turns = (n) =>
  Array.from({ length: n }, (_, i) => ({
    type: "assistant",
    message: {
      id: `msg_${i}`,
      model: MODEL,
      usage: { input_tokens: 1_000 },
    },
  }));
const payload = (agent_type) => ({
  agent_id: "a1",
  agent_type,
  transcript_path: "/s/x.jsonl",
});
/** The note of `decide` for a transcript of `rows`. */
const note = (rows, p = payload("dotclaude:test-runner")) =>
  decide(p, () => rows, { readAll: () => rows })?.hookSpecificOutput
    .additionalContext;

test("below the level, a subagent gets no note", () => {
  expect(note(turns(LIMIT - TURNS_LEFT_AT - 1))).toBeUndefined();
});

test("at the level, a subagent gets a note", () => {
  expect(note(turns(LIMIT - TURNS_LEFT_AT))?.length).toBeGreaterThan(0);
});

test("rows with one `message.id` count one turn", () => {
  const rows = turns(10).flatMap((r) => [r, r, r]);
  expect(countTurns(rows)).toBe(10);
  expect(note(rows)).toBeUndefined();
});

test("a user row is no turn", () => {
  expect(countTurns([{ type: "user", message: { role: "user" } }])).toBe(0);
});

test("an unknown agent type, and a missing one, give no note", () => {
  expect(note(turns(LONG), payload("dotclaude:nobody"))).toBeUndefined();
  expect(note(turns(LONG), payload("../agents/test-runner"))).toBeUndefined();
  expect(note(turns(LONG), payload(undefined))).toBeUndefined();
});

test("an agent file with no `maxTurns` gives no note", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "turns-"));
  try {
    fs.writeFileSync(path.join(dir, "free.md"), "---\nname: free\n---\nBody\n");
    expect(maxTurnsOf("free", dir)).toBeUndefined();
    const rows = turns(LONG);
    const out = decide(payload("free"), () => rows, {
      readAll: () => rows,
      agentsDir: dir,
    });
    expect(out).toBeUndefined();
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("`maxTurns` comes from the frontmatter, with or without the plugin prefix", () => {
  expect(Number.isInteger(LIMIT)).toBe(true);
  expect(maxTurnsOf("dotclaude:implementer")).toBe(LONG);
});

test("the count reads the whole transcript, so a long run is not cut", () => {
  const rows = turns(LONG - TURNS_LEFT_AT);
  expect(note(rows, payload("dotclaude:implementer"))?.length).toBeGreaterThan(
    0,
  );
});

test("the context note and the turn note are one note", () => {
  const rows = turns(LIMIT - TURNS_LEFT_AT);
  const turnOnly = note(rows);
  rows[rows.length - 1].message.usage.input_tokens = HAIKU_CONTEXT_MAX + 1;
  const out = decide(payload("dotclaude:test-runner"), () => rows, {
    readAll: () => rows,
  });
  const text = out.hookSpecificOutput.additionalContext;
  expect(text.length).toBeGreaterThan(turnOnly.length);
});

test("`TURNS_LEFT_AT` is below the smallest `maxTurns` of the agent files", () => {
  const all = fs
    .readdirSync(AGENTS)
    .map((f) => maxTurnsOf(f.replace(/\.md$/, "")))
    .filter(Boolean);
  expect(all.length).toBeGreaterThan(0);
  expect(TURNS_LEFT_AT).toBeGreaterThan(0);
  expect(TURNS_LEFT_AT).toBeLessThan(Math.min(...all));
});
