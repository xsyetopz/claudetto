// The bounds of `features/context/limits.ts` against the triggers of the report-now hook.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
  HAIKU_CONTEXT_MAX,
  SUBAGENT_CONTEXT_MAX,
} from "../../../plugins/dotclaude/features/context/limits.ts";
import type { TranscriptRow } from "../../../plugins/dotclaude/features/context/turns.ts";
import {
  decide,
  subagentPath,
  tailRows,
} from "../../../plugins/dotclaude/hooks/PostToolUse/context.ts";
import { tmpDir } from "../../support/repo.ts";

/** The output of the report-now hook, as the test reads it. */

test("the Haiku bound is below the 100K prompt-token price step and below the subagent bound", () => {
  expect(HAIKU_CONTEXT_MAX > 0, `${HAIKU_CONTEXT_MAX}`).toBeTruthy();
  expect(HAIKU_CONTEXT_MAX < 100_000, `${HAIKU_CONTEXT_MAX}`).toBeTruthy();
  expect(
    HAIKU_CONTEXT_MAX < SUBAGENT_CONTEXT_MAX,
    `${HAIKU_CONTEXT_MAX}`,
  ).toBeTruthy();
});

test("`SUBAGENT_CONTEXT_MAX` is the trigger of the report-now hook", async () => {
  const over = { agent_id: "a1", transcript_path: "/s/x.jsonl" };
  const rows = (tokens: number) => async () => [
    { message: { usage: { input_tokens: tokens } } },
  ];
  expect(await decide(over, rows(SUBAGENT_CONTEXT_MAX))).toBe(undefined);
  const out = await decide(over, rows(SUBAGENT_CONTEXT_MAX + 1));
  // A missing note is the empty text, so the check fails.
  const text = out?.hookSpecificOutput.additionalContext ?? "";
  expect(text.length > 0, `${text.length}`).toBeTruthy();
});

test("the report-now hook is silent in the main session and below the bound", async () => {
  const rows = async () => [{ message: { usage: { input_tokens: 1 } } }];
  expect(await decide({ transcript_path: "/s/x.jsonl" }, rows)).toBe(undefined);
  expect(
    await decide({ agent_id: "a1", transcript_path: "/s/x.jsonl" }, rows),
  ).toBe(undefined);
});

test("the hook reads the last request from the tail of the subagent transcript", async () => {
  expect(subagentPath("/s/abc.jsonl", "a1")).toBe(
    path.join("/s/abc", "subagents", "agent-a1.jsonl"),
  );
  const dir = tmpDir("ctx");
  try {
    const file = path.join(dir, "t.jsonl");
    const row = (n: number) =>
      JSON.stringify({ message: { usage: { input_tokens: n } } });
    const filler = JSON.stringify({ text: "x".repeat(300_000) });
    await Bun.write(file, [row(1), filler, row(5), row(7)].join("\n"));
    const rows = await tailRows(file);
    expect((rows.at(-1) as TranscriptRow).message?.usage?.input_tokens).toBe(7);
    expect(rows.some((r) => r.message?.usage?.input_tokens === 1)).toBe(false);
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});

const HAIKU = "claude-haiku-5-5";
const SONNET = "claude-sonnet-5-5";
const rowsOf = (model: string, tokens: number) => async () => [
  { message: { model: "<synthetic>" } },
  { message: { model, usage: { input_tokens: tokens } } },
];
const sub = { agent_id: "a1", transcript_path: "/s/x.jsonl" };

test("a Haiku 5.5 subagent at 90K gets the message and a Sonnet 5.5 subagent does not", async () => {
  const out = await decide(sub, rowsOf(HAIKU, 90_000));
  // A missing note is the empty text, so the check fails.
  const text = out?.hookSpecificOutput.additionalContext ?? "";
  expect(text.length > 0, `${text.length}`).toBeTruthy();
  expect(await decide(sub, rowsOf(SONNET, 90_000))).toBe(undefined);
});

test("`HAIKU_CONTEXT_MAX` is the trigger of a Haiku 5.5 subagent", async () => {
  expect(await decide(sub, rowsOf(HAIKU, HAIKU_CONTEXT_MAX))).toBe(undefined);
  expect(await decide(sub, rowsOf(HAIKU, HAIKU_CONTEXT_MAX + 1))).not.toBe(
    undefined,
  );
});

test("a subagent with no model in its transcript uses `SUBAGENT_CONTEXT_MAX`", async () => {
  const rows = async () => [{ message: { usage: { input_tokens: 90_000 } } }];
  expect(await decide(sub, rows)).toBe(undefined);
});
