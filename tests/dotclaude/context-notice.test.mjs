// The level notes of the main session (spec usage-awareness, design D32):
// one note when the context or a usage window first reaches a level, from `UserPromptSubmit` and `PostToolUse`.
// The tests compute each figure from the levels in `limits.mjs`.

import { expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { levelNote } from "../../plugins/dotclaude/features/context/cli.mjs";
import {
  CONTEXT_HANDOFF_AT,
  CONTEXT_NOTICE_AT,
  RATE_HANDOFF_AT,
  RATE_HANDOFF_MINUTES,
  RATE_NOTICE_AT,
} from "../../plugins/dotclaude/features/context/limits.mjs";
import {
  claimLevel,
  HANDOFF_MARK,
} from "../../plugins/dotclaude/features/context/marker.mjs";
import { CONTEXT_WINDOW } from "../../plugins/dotclaude/lib/budget.mjs";

const NOW = 1_800_000_000;
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
const fiveHour = (pct, extra = {}) => ({
  five_hour: {
    used_percentage: pct,
    resets_at: NOW + 3600,
    run_out_at: null,
    ...extra,
  },
});

/**
 * A session with a marker in memory: `note(tokens, usage)` gives the text or `undefined`.
 * The hook claims `HANDOFF_MARK` when it gives a handoff, so `note.handoffs()` counts the handoffs.
 */
function session(env = {}) {
  const fired = new Set();
  let handoffs = 0;
  const note = (tokens, usage, p = payload) =>
    levelNote(p, {
      read: () => [row(tokens)],
      env,
      now: NOW,
      usage: usage ?? null,
      claim: (_, id) => {
        if (id === HANDOFF_MARK) handoffs++;
        return !fired.has(id) && Boolean(fired.add(id));
      },
    })?.hookSpecificOutput.additionalContext;
  note.handoffs = () => handoffs;
  return note;
}

/** The text of one call of `note`, and whether that call gave a handoff. */
function call(note, ...args) {
  const before = note.handoffs();
  const text = note(...args);
  return { text, handoff: note.handoffs() > before };
}

test("below the first level of each share, no output has `additionalContext`", () => {
  expect(session()(at(40), fiveHour(50))).toBeUndefined();
  expect(session()(at(CONTEXT_NOTICE_AT) - 1, undefined)).toBeUndefined();
  expect(session()(0, fiveHour(RATE_NOTICE_AT - 1))).toBeUndefined();
});

test("at the context notice, the hook gives a note and no handoff", () => {
  const r = call(session(), at(CONTEXT_NOTICE_AT), undefined);
  expect(r.text?.length).toBeGreaterThan(0);
  expect(r.handoff).toBe(false);
});

test("each level fires one time in a session", () => {
  const note = session();
  expect(note(at(CONTEXT_NOTICE_AT), undefined)).toBeDefined();
  expect(note(at(CONTEXT_NOTICE_AT) + 5000, undefined)).toBeUndefined();
  expect(call(note, at(CONTEXT_HANDOFF_AT), undefined).handoff).toBe(true);
  expect(note(at(CONTEXT_HANDOFF_AT) + 5000, undefined)).toBeUndefined();
});

test("a level passed in a turn fires from `PostToolUse`, and the next prompt gets no second note", () => {
  const note = session();
  const tool = { ...payload, hook_event_name: "PostToolUse" };
  expect(note(at(58), undefined, tool)).toBeUndefined();
  const out = levelNote(tool, {
    read: () => [row(at(62))],
    now: NOW,
    usage: null,
    claim: () => true,
  });
  expect(out.hookSpecificOutput.hookEventName).toBe("PostToolUse");
  const r = call(note, at(62), undefined, tool);
  expect(r.text?.length).toBeGreaterThan(0);
  expect(r.handoff).toBe(false);
  expect(note(at(62), undefined)).toBeUndefined();
});

test("a jump over both context levels gives the handoff only, and the notice does not fire later", () => {
  const note = session();
  const r = call(note, at(CONTEXT_HANDOFF_AT) + 1, undefined);
  expect(r.text?.length).toBeGreaterThan(0);
  expect(r.handoff).toBe(true);
  expect(note(at(CONTEXT_HANDOFF_AT) + 2, undefined)).toBeUndefined();
});

test("the usage notice fires at `RATE_NOTICE_AT` and is no handoff", () => {
  const r = call(session(), at(10), fiveHour(RATE_NOTICE_AT));
  expect(r.text?.length).toBeGreaterThan(0);
  expect(r.handoff).toBe(false);
  expect(session()(at(10), fiveHour(RATE_NOTICE_AT - 1))).toBeUndefined();
});

test("the usage handoff fires at its level, in a small session and in a large one", () => {
  const note = session();
  note(at(10), fiveHour(RATE_NOTICE_AT));
  expect(call(note, at(10), fiveHour(RATE_HANDOFF_AT)).handoff).toBe(true);
  const large = call(
    session(),
    at(CONTEXT_NOTICE_AT),
    fiveHour(RATE_HANDOFF_AT),
  );
  expect(large.handoff).toBe(true);
});

test("fast burn: at 82% with the run-out in 12 minutes, the hook gives the usage handoff", () => {
  expect(
    call(session(), 0, fiveHour(82, { run_out_at: NOW + 12 * 60 })).handoff,
  ).toBe(true);
  const slow = fiveHour(82, {
    run_out_at: NOW + (RATE_HANDOFF_MINUTES + 1) * 60,
  });
  expect(call(session(), 0, slow).handoff).toBe(false);
});

test("a run-out time in the past gives no usage handoff", () => {
  const stale = fiveHour(40, { run_out_at: NOW - 86_400 });
  expect(session()(0, stale)).toBeUndefined();
});

test("a level that the hook cannot claim gives no note, so no note repeats at each call", () => {
  const out = levelNote(payload, {
    read: () => [row(at(CONTEXT_HANDOFF_AT))],
    now: NOW,
    usage: null,
    claim: () => false,
  });
  expect(out).toBeUndefined();
});

test("a level marker is claimed one time, and a missing folder claims nothing", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dc-marker-"));
  try {
    expect(claimLevel("s", "context:notice", dir)).toBe(true);
    expect(claimLevel("s", "context:notice", dir)).toBe(false);
    expect(claimLevel("t", "context:notice", dir)).toBe(true);
    expect(claimLevel("s", "context:notice", path.join(dir, "none"))).toBe(
      false,
    );
    expect(claimLevel("s", "context:notice", null)).toBe(false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("a new usage window fires its levels again", () => {
  const note = session();
  expect(note(0, fiveHour(RATE_NOTICE_AT))).toBeDefined();
  const next = {
    five_hour: { ...fiveHour(RATE_NOTICE_AT).five_hour, resets_at: NOW + 7200 },
  };
  expect(note(0, next)).toBeDefined();
});

test("with no state file, the hook gives the context notes only", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dc-levels-"));
  try {
    const text = levelNote(payload, {
      read: () => [row(at(CONTEXT_NOTICE_AT))],
      env: { CLAUDE_CONFIG_DIR: dir },
      now: NOW,
      claim: () => true,
    }).hookSpecificOutput.additionalContext;
    expect(text.length).toBeGreaterThan(0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("the note differs from the default only when `DISABLE_COMPACT` turns compaction off", () => {
  const text = (value) =>
    session({ DISABLE_COMPACT: value })(at(CONTEXT_NOTICE_AT), undefined);
  const base = text(undefined);
  expect(base?.length).toBeGreaterThan(0);
  for (const on of ["", "0", "false"]) expect(text(on)).toBe(base);
  for (const off of ["1", "true"]) expect(text(off)).not.toBe(base);
});

test("the context is the last main-session request: a sidechain row is skipped", () => {
  const out = levelNote(payload, {
    read: () => [row(at(CONTEXT_NOTICE_AT)), row(10, { isSidechain: true })],
    now: NOW,
    usage: null,
    claim: () => true,
  });
  const alone = levelNote(payload, {
    read: () => [row(at(CONTEXT_NOTICE_AT))],
    now: NOW,
    usage: null,
    claim: () => true,
  });
  expect(out.hookSpecificOutput.additionalContext).toBe(
    alone.hookSpecificOutput.additionalContext,
  );
});

test("a missing transcript path or an unreadable transcript gives no output", () => {
  expect(levelNote({ hook_event_name: "UserPromptSubmit" })).toBeUndefined();
  expect(
    levelNote(
      { ...payload, transcript_path: "/nope/x.jsonl" },
      { usage: null },
    ),
  ).toBeUndefined();
});

test("the entry exits 0, prints nothing below the levels, and prints one note at a level", () => {
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
        env: { ...process.env, TMPDIR: dir, CLAUDE_CONFIG_DIR: dir },
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
    const out = run(high);
    expect(out.exitCode).toBe(0);
    expect(
      JSON.parse(out.stdout.toString()).hookSpecificOutput.additionalContext
        .length,
    ).toBeGreaterThan(0);
    expect(run(high).stdout.toString()).toBe("");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
