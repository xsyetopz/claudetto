// The bounds of `features/context/limits.mjs` against the triggers of the report-now hook.

import { expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  decide,
  subagentPath,
  tailRows,
} from "../../plugins/dotclaude/features/context/cli.mjs";
import {
  CONTEXT_NOTICE_AT,
  HAIKU_CONTEXT_MAX,
  REPORT_MAX_WORDS,
  RESULT_MAX_CHARS,
  SUBAGENT_CONTEXT_MAX,
} from "../../plugins/dotclaude/features/context/limits.mjs";

test("the bounds are positive numbers", () => {
  for (const v of [
    SUBAGENT_CONTEXT_MAX,
    HAIKU_CONTEXT_MAX,
    REPORT_MAX_WORDS,
    CONTEXT_NOTICE_AT,
    RESULT_MAX_CHARS,
  ])
    expect(v).toBeGreaterThan(0);
  expect(HAIKU_CONTEXT_MAX).toBeLessThan(100_000);
  expect(HAIKU_CONTEXT_MAX).toBeLessThan(SUBAGENT_CONTEXT_MAX);
  expect(RESULT_MAX_CHARS).toBe(8_000);
  expect(CONTEXT_NOTICE_AT).toBeLessThan(100);
});

test("`SUBAGENT_CONTEXT_MAX` is the trigger of the report-now hook", () => {
  const over = { agent_id: "a1", transcript_path: "/s/x.jsonl" };
  const rows = (tokens) => () => [
    { message: { usage: { input_tokens: tokens } } },
  ];
  expect(decide(over, rows(SUBAGENT_CONTEXT_MAX))).toBeUndefined();
  const out = decide(over, rows(SUBAGENT_CONTEXT_MAX + 1));
  expect(out.hookSpecificOutput.additionalContext.length).toBeGreaterThan(0);
});

test("the report-now hook is silent in the main session and below the bound", () => {
  const rows = () => [{ message: { usage: { input_tokens: 1 } } }];
  expect(decide({ transcript_path: "/s/x.jsonl" }, rows)).toBeUndefined();
  expect(
    decide({ agent_id: "a1", transcript_path: "/s/x.jsonl" }, rows),
  ).toBeUndefined();
});

test("the hook reads the last request from the tail of the subagent transcript", () => {
  expect(subagentPath("/s/abc.jsonl", "a1")).toBe(
    "/s/abc/subagents/agent-a1.jsonl",
  );
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ctx-"));
  try {
    const file = path.join(dir, "t.jsonl");
    const row = (n) =>
      JSON.stringify({ message: { usage: { input_tokens: n } } });
    const filler = JSON.stringify({ text: "x".repeat(300_000) });
    fs.writeFileSync(file, [row(1), filler, row(5), row(7)].join("\n"));
    const rows = tailRows(file);
    expect(rows.at(-1).message.usage.input_tokens).toBe(7);
    expect(rows.some((r) => r.message?.usage?.input_tokens === 1)).toBe(false);
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
  expect(out.hookSpecificOutput.additionalContext.length).toBeGreaterThan(0);
  expect(decide(sub, rowsOf(SONNET, 90_000))).toBeUndefined();
});

test("`HAIKU_CONTEXT_MAX` is the trigger of a Haiku 5.5 subagent", () => {
  expect(decide(sub, rowsOf(HAIKU, HAIKU_CONTEXT_MAX))).toBeUndefined();
  expect(decide(sub, rowsOf(HAIKU, HAIKU_CONTEXT_MAX + 1))).toBeDefined();
});

test("a subagent with no model in its transcript uses `SUBAGENT_CONTEXT_MAX`", () => {
  const rows = () => [{ message: { usage: { input_tokens: 90_000 } } }];
  expect(decide(sub, rows)).toBeUndefined();
});
