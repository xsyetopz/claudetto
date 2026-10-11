// The bounds of `features/context/limits.mjs` against the triggers of the report-now hook.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import {
  decide,
  subagentPath,
  tailRows,
} from "../../../plugins/dotclaude/features/context/cli.mjs";
import {
  HAIKU_CONTEXT_MAX,
  SUBAGENT_CONTEXT_MAX,
} from "../../../plugins/dotclaude/features/context/limits.mjs";
import { tmpDir } from "../../support/repo.mjs";

test("the Haiku bound is below the 100K prompt-token price step and below the subagent bound", () => {
  assert.ok(HAIKU_CONTEXT_MAX > 0, `${HAIKU_CONTEXT_MAX}`);
  assert.ok(HAIKU_CONTEXT_MAX < 100_000, `${HAIKU_CONTEXT_MAX}`);
  assert.ok(HAIKU_CONTEXT_MAX < SUBAGENT_CONTEXT_MAX, `${HAIKU_CONTEXT_MAX}`);
});

test("`SUBAGENT_CONTEXT_MAX` is the trigger of the report-now hook", () => {
  const over = { agent_id: "a1", transcript_path: "/s/x.jsonl" };
  const rows = (tokens) => () => [
    { message: { usage: { input_tokens: tokens } } },
  ];
  assert.equal(decide(over, rows(SUBAGENT_CONTEXT_MAX)), undefined);
  const out = decide(over, rows(SUBAGENT_CONTEXT_MAX + 1));
  assert.ok(
    out.hookSpecificOutput.additionalContext.length > 0,
    `${out.hookSpecificOutput.additionalContext.length}`,
  );
});

test("the report-now hook is silent in the main session and below the bound", () => {
  const rows = () => [{ message: { usage: { input_tokens: 1 } } }];
  assert.equal(decide({ transcript_path: "/s/x.jsonl" }, rows), undefined);
  assert.equal(
    decide({ agent_id: "a1", transcript_path: "/s/x.jsonl" }, rows),
    undefined,
  );
});

test("the hook reads the last request from the tail of the subagent transcript", () => {
  assert.equal(
    subagentPath("/s/abc.jsonl", "a1"),
    "/s/abc/subagents/agent-a1.jsonl",
  );
  const dir = tmpDir("ctx");
  try {
    const file = path.join(dir, "t.jsonl");
    const row = (n) =>
      JSON.stringify({ message: { usage: { input_tokens: n } } });
    const filler = JSON.stringify({ text: "x".repeat(300_000) });
    fs.writeFileSync(file, [row(1), filler, row(5), row(7)].join("\n"));
    const rows = tailRows(file);
    assert.equal(rows.at(-1).message.usage.input_tokens, 7);
    assert.equal(
      rows.some((r) => r.message?.usage?.input_tokens === 1),
      false,
    );
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});

const HAIKU = "claude-haiku-5-5";
const SONNET = "claude-sonnet-5-5";
const rowsOf = (model, tokens) => () => [
  { message: { model: "<synthetic>" } },
  { message: { model, usage: { input_tokens: tokens } } },
];
const sub = { agent_id: "a1", transcript_path: "/s/x.jsonl" };

test("a Haiku 5.5 subagent at 90K gets the message and a Sonnet 5.5 subagent does not", () => {
  const out = decide(sub, rowsOf(HAIKU, 90_000));
  assert.ok(
    out.hookSpecificOutput.additionalContext.length > 0,
    `${out.hookSpecificOutput.additionalContext.length}`,
  );
  assert.equal(decide(sub, rowsOf(SONNET, 90_000)), undefined);
});

test("`HAIKU_CONTEXT_MAX` is the trigger of a Haiku 5.5 subagent", () => {
  assert.equal(decide(sub, rowsOf(HAIKU, HAIKU_CONTEXT_MAX)), undefined);
  assert.notEqual(decide(sub, rowsOf(HAIKU, HAIKU_CONTEXT_MAX + 1)), undefined);
});

test("a subagent with no model in its transcript uses `SUBAGENT_CONTEXT_MAX`", () => {
  const rows = () => [{ message: { usage: { input_tokens: 90_000 } } }];
  assert.equal(decide(sub, rows), undefined);
});
