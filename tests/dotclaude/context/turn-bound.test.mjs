// The turn bound of a subagent: the count of turns in the transcript, `maxTurns` of the agent file,
// and the one note at `TURNS_LEFT_AT` turns left (task 10.9).
// The reads are fakes, so no test reads a real transcript.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { decide } from "../../../plugins/dotclaude/features/context/cli.mjs";
import {
  HAIKU_CONTEXT_MAX,
  TURNS_LEFT_AT,
} from "../../../plugins/dotclaude/features/context/limits.mjs";
import {
  countTurns,
  maxTurnsOf,
} from "../../../plugins/dotclaude/features/context/turns.mjs";
import { PLUGINS, tmpDir } from "../../support/repo.mjs";

const AGENTS = path.join(PLUGINS, "dotclaude/agents");
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
  assert.equal(note(turns(LIMIT - TURNS_LEFT_AT - 1)), undefined);
});

test("at the level, a subagent gets a note", () => {
  assert.ok(
    note(turns(LIMIT - TURNS_LEFT_AT))?.length > 0,
    `${note(turns(LIMIT - TURNS_LEFT_AT))?.length}`,
  );
});

test("rows with one `message.id` count one turn", () => {
  const rows = turns(10).flatMap((r) => [r, r, r]);
  assert.equal(countTurns(rows), 10);
  assert.equal(note(rows), undefined);
});

test("a user row is no turn", () => {
  assert.equal(countTurns([{ type: "user", message: { role: "user" } }]), 0);
});

test("an unknown agent type, and a missing one, give no note", () => {
  assert.equal(note(turns(LONG), payload("dotclaude:nobody")), undefined);
  assert.equal(note(turns(LONG), payload("../agents/test-runner")), undefined);
  assert.equal(note(turns(LONG), payload(undefined)), undefined);
});

test("an agent file with no `maxTurns` gives no note", () => {
  const dir = tmpDir("turns");
  try {
    fs.writeFileSync(path.join(dir, "free.md"), "---\nname: free\n---\nBody\n");
    assert.equal(maxTurnsOf("free", dir), undefined);
    const rows = turns(LONG);
    const out = decide(payload("free"), () => rows, {
      readAll: () => rows,
      agentsDir: dir,
    });
    assert.equal(out, undefined);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("`maxTurns` comes from the frontmatter, with or without the plugin prefix", () => {
  assert.equal(Number.isInteger(LIMIT), true);
  assert.equal(maxTurnsOf("dotclaude:implementer"), LONG);
});

test("the count reads the whole transcript, so a long run is not cut", () => {
  const rows = turns(LONG - TURNS_LEFT_AT);
  assert.ok(
    note(rows, payload("dotclaude:implementer"))?.length > 0,
    `${note(rows, payload("dotclaude:implementer"))?.length}`,
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
  assert.ok(text.length > turnOnly.length, `${text.length}`);
});

test("`TURNS_LEFT_AT` is below the smallest `maxTurns` of the agent files", () => {
  const all = fs
    .readdirSync(AGENTS)
    .map((f) => maxTurnsOf(f.replace(/\.md$/, "")))
    .filter(Boolean);
  assert.ok(all.length > 0, `${all.length}`);
  assert.ok(TURNS_LEFT_AT > 0, `${TURNS_LEFT_AT}`);
  assert.ok(TURNS_LEFT_AT < Math.min(...all), `${TURNS_LEFT_AT}`);
});
