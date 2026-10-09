// The context note of the main session (spec context-bound, design D32, D35):
// the `UserPromptSubmit` hook gives the note at each prompt at or above a level, keeps no state, and writes no file.
// The tests compute each figure from the levels in `limits.mjs`.

import { expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  levelNote,
  route,
} from "../../plugins/dotclaude/features/context/cli.mjs";
import {
  CONTEXT_HANDOFF_AT,
  CONTEXT_NOTICE_AT,
} from "../../plugins/dotclaude/features/context/limits.mjs";
import { HANDOFF_STEPS } from "../../plugins/dotclaude/features/context/notes.mjs";
import { CONTEXT_WINDOW } from "../../plugins/dotclaude/lib/budget.mjs";

const at = (pct) => Math.ceil((CONTEXT_WINDOW * pct) / 100);
/** A transcript row with `tokens` of context split over the three usage fields. */
const row = (tokens, extra = {}) => ({
  message: {
    usage: {
      input_tokens: 10,
      cache_creation_input_tokens: 90,
      cache_read_input_tokens: tokens - 100,
    },
  },
  ...extra,
});
const payload = {
  hook_event_name: "UserPromptSubmit",
  session_id: "s1",
  transcript_path: "/s/x.jsonl",
};
/** The note text for a main session with `tokens` of context, or `undefined`. */
const note = (tokens, env = {}) =>
  levelNote(payload, { read: () => [row(tokens)], env })?.hookSpecificOutput
    .additionalContext;

test("below the notice level, the hook gives no `additionalContext`", () => {
  expect(note(at(40))).toBeUndefined();
  expect(note(at(CONTEXT_NOTICE_AT) - 1)).toBeUndefined();
});

test("at the notice level, the hook gives the note and no handoff steps", () => {
  const text = note(at(CONTEXT_NOTICE_AT));
  expect(text?.length).toBeGreaterThan(0);
  expect(text).not.toContain(HANDOFF_STEPS);
});

test("at the handoff level, the note also gives the handoff steps", () => {
  expect(note(at(CONTEXT_HANDOFF_AT))).toContain(HANDOFF_STEPS);
});

test("the hook keeps no state: the same prompt gives the same note again", () => {
  const first = note(at(CONTEXT_NOTICE_AT));
  expect(note(at(CONTEXT_NOTICE_AT))).toBe(first);
  expect(note(at(CONTEXT_NOTICE_AT) + 5000)).toBeDefined();
});

test("the output names the event of the payload", () => {
  const out = levelNote(payload, { read: () => [row(at(62))] });
  expect(out.hookSpecificOutput.hookEventName).toBe("UserPromptSubmit");
});

test("the main session gets no note from `PostToolUse` and the other events", () => {
  for (const hook_event_name of ["PostToolUse", "SessionStart", "SessionEnd"])
    expect(
      route({ ...payload, hook_event_name, transcript_path: "/nope" }),
    ).toBeUndefined();
});

test("the note differs from the default only when `DISABLE_COMPACT` turns compaction off", () => {
  const text = (value) =>
    note(at(CONTEXT_NOTICE_AT), { DISABLE_COMPACT: value });
  const base = text(undefined);
  expect(base?.length).toBeGreaterThan(0);
  for (const on of ["", "0", "false"]) expect(text(on)).toBe(base);
  for (const off of ["1", "true"]) expect(text(off)).not.toBe(base);
});

test("the context is the last main-session request: a sidechain row is skipped", () => {
  const out = levelNote(payload, {
    read: () => [row(at(CONTEXT_NOTICE_AT)), row(10, { isSidechain: true })],
  });
  const alone = levelNote(payload, {
    read: () => [row(at(CONTEXT_NOTICE_AT))],
  });
  expect(out.hookSpecificOutput.additionalContext).toBe(
    alone.hookSpecificOutput.additionalContext,
  );
});

test("a missing transcript path, an unreadable transcript, or no `usage` gives no output", () => {
  expect(levelNote({ hook_event_name: "UserPromptSubmit" })).toBeUndefined();
  expect(
    levelNote({ ...payload, transcript_path: "/nope/x.jsonl" }),
  ).toBeUndefined();
  expect(
    levelNote(payload, { read: () => [{ type: "user" }] }),
  ).toBeUndefined();
});

test("the entry exits 0, prints nothing below the level, prints the note at each prompt at a level, and writes no file", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dc-notice-"));
  try {
    const entry = path.join(
      import.meta.dirname,
      "../../plugins/dotclaude/features/context/cli.mjs",
    );
    const run = (transcript_path) =>
      Bun.spawnSync(["node", entry], {
        stdin: new TextEncoder().encode(
          JSON.stringify({ ...payload, transcript_path }),
        ),
        env: {
          ...process.env,
          TMPDIR: dir,
          CLAUDE_CONFIG_DIR: dir,
          CLAUDE_PLUGIN_DATA: dir,
        },
      });
    const missing = run(path.join(dir, "none.jsonl"));
    expect(missing.exitCode).toBe(0);
    expect(missing.stdout.toString()).toBe("");
    const low = path.join(dir, "low.jsonl");
    fs.writeFileSync(low, `${JSON.stringify(row(5000))}\n`);
    expect(run(low).stdout.toString()).toBe("");
    const high = path.join(dir, "high.jsonl");
    fs.writeFileSync(
      high,
      `${JSON.stringify(row(at(CONTEXT_NOTICE_AT)))}\nnot json\n`,
    );
    const names = fs.readdirSync(dir).sort();
    const out = run(high);
    expect(out.exitCode).toBe(0);
    expect(
      JSON.parse(out.stdout.toString()).hookSpecificOutput.additionalContext
        .length,
    ).toBeGreaterThan(0);
    expect(run(high).stdout.toString()).toBe(out.stdout.toString());
    expect(fs.readdirSync(dir).sort()).toEqual(names);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
