// Layer 2 of design D32 (spec usage-awareness): the handoff across `/clear` and the record of a hard stop.
// The payloads have the fields of probe 22.1, and each test uses its own temporary `${CLAUDE_PLUGIN_DATA}`.

import { afterEach, beforeEach, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  carryFile,
  lastAssistantText,
  recordStop,
  saveHandoff,
  startNote,
} from "../../plugins/dotclaude/features/context/carry.mjs";
import {
  levelNote,
  route,
} from "../../plugins/dotclaude/features/context/cli.mjs";
import {
  CONTEXT_HANDOFF_AT,
  CONTEXT_NOTICE_AT,
  STOP_RECORD_MAX_CHARS,
} from "../../plugins/dotclaude/features/context/limits.mjs";
import {
  claimLevel,
  HANDOFF_MARK,
  handedOff,
} from "../../plugins/dotclaude/features/context/marker.mjs";
import { CONTEXT_WINDOW } from "../../plugins/dotclaude/lib/budget.mjs";

const CWD = "/work/project";
const NOW = 1_800_000_000;
const HANDOFF =
  "Handoff done. Run `/clear`, and then `/opsx:apply dotclaude-0-28-0`.";
let dir;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "carry-"));
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

const assistant = (content, extra = {}) => ({
  type: "assistant",
  message: { role: "assistant", content },
  ...extra,
});
const end = (extra = {}) => ({
  hook_event_name: "SessionEnd",
  session_id: "old",
  transcript_path: "/t/old.jsonl",
  cwd: CWD,
  reason: "clear",
  ...extra,
});
const start = (source) => ({
  hook_event_name: "SessionStart",
  session_id: "new",
  transcript_path: "/t/new.jsonl",
  cwd: CWD,
  source,
});
const context = (out) => out?.hookSpecificOutput.additionalContext;
const save = (
  payload,
  { off = true, rows = [assistant([{ type: "text", text: HANDOFF }])] } = {},
) => saveHandoff(payload, { dir, read: () => rows, handedOff: () => off });

test("the last assistant text skips sidechain rows, tool calls, and empty rows", () => {
  const rows = [
    assistant([{ type: "text", text: "first" }]),
    assistant([{ type: "text", text: "main" }]),
    assistant([{ type: "tool_use", name: "Read" }]),
    assistant([{ type: "text", text: "side" }], { isSidechain: true }),
    { type: "user", message: { content: "next" } },
  ];
  expect(lastAssistantText(rows)).toBe("main");
  expect(lastAssistantText([assistant("plain")])).toBe("plain");
  expect(lastAssistantText([])).toBe("");
});

test("a handoff before `/clear` reaches the next session one time, and a second `/clear` gives it no more", () => {
  save(end());
  const text = context(startNote(start("clear"), { dir }));
  expect(text).toContain(HANDOFF);
  expect(startNote(start("clear"), { dir })).toBeUndefined();
});

test("no handoff is saved for a session with no handoff note, for another end reason, or with no data folder", () => {
  save(end(), { off: false });
  save(end({ reason: "other" }));
  saveHandoff(end(), { dir: undefined, read: () => [], handedOff: () => true });
  expect(fs.readdirSync(dir)).toEqual([]);
});

test("a saved handoff waits for a `/clear` start, and the files of another project folder stay apart", () => {
  save(end());
  expect(startNote(start("startup"), { dir })).toBeUndefined();
  expect(
    startNote({ ...start("clear"), cwd: "/work/other" }, { dir }),
  ).toBeUndefined();
  expect(context(startNote(start("clear"), { dir }))).toContain(HANDOFF);
});

test(`a long message is cut to STOP_RECORD_MAX_CHARS (${STOP_RECORD_MAX_CHARS}) characters`, () => {
  save(end(), { rows: [assistant("x".repeat(STOP_RECORD_MAX_CHARS + 50))] });
  const saved = JSON.parse(
    fs.readFileSync(carryFile("handoff", CWD, dir), "utf8"),
  );
  expect(saved.text).toBe(`${"x".repeat(STOP_RECORD_MAX_CHARS)}…`);
});

test("a usage-limit stop writes a record, and the next start names it in one line, one time", () => {
  const message = "You've hit your session limit · resets 3pm (Europe/Riga)";
  recordStop(
    {
      hook_event_name: "StopFailure",
      cwd: CWD,
      error: "rate_limit",
      last_assistant_message: message,
    },
    { dir, now: NOW },
  );
  const record = JSON.parse(
    fs.readFileSync(carryFile("stop", CWD, dir), "utf8"),
  );
  expect(record).toEqual({
    t: NOW,
    error: "rate_limit",
    resets: "3pm (Europe/Riga)",
    message,
  });
  const line = context(startNote(start("startup"), { dir }));
  expect(line.split("\n")).toHaveLength(1);
  expect(line).toContain("`rate_limit`");
  expect(line).toContain("3pm (Europe/Riga)");
  expect(startNote(start("startup"), { dir })).toBeUndefined();
  expect(fs.existsSync(carryFile("last-stop", CWD, dir))).toBe(true);
});

test("a full-context stop has no reset time, and a stop of a subagent writes no record", () => {
  recordStop(
    {
      cwd: CWD,
      error: "invalid_request",
      last_assistant_message: "Prompt is too long",
    },
    { dir, now: NOW },
  );
  const line = context(startNote(start("resume"), { dir }));
  expect(line).toContain("`invalid_request`");
  recordStop(
    { cwd: CWD, agent_id: "a1", error: "rate_limit" },
    { dir, now: NOW },
  );
  expect(fs.existsSync(carryFile("stop", CWD, dir))).toBe(false);
});

test("a `/clear` start after a stop and a handoff gives the stop line and the handoff", () => {
  save(end());
  recordStop({ cwd: CWD, error: "rate_limit" }, { dir, now: NOW });
  const text = context(startNote(start("clear"), { dir }));
  expect(text).toContain("`rate_limit`");
  expect(text).toContain(HANDOFF);
});

test("the handoff marker is set by a claim, and `route` sends each event of the hook to its handler", () => {
  expect(handedOff("s", dir)).toBe(false);
  expect(claimLevel("s", HANDOFF_MARK, dir)).toBe(true);
  expect(handedOff("s", dir)).toBe(true);
  expect(handedOff("s", null)).toBe(false);
  route(
    { hook_event_name: "StopFailure", cwd: CWD, error: "rate_limit" },
    { dir },
  );
  expect(context(route(start("startup"), { dir }))).toContain("`rate_limit`");
  expect(
    route(
      { hook_event_name: "SessionEnd", cwd: CWD, reason: "clear" },
      { dir: undefined },
    ),
  ).toBeUndefined();
});

test("a handoff note claims the handoff marker, and a notice does not", () => {
  const claimed = (pct) => {
    const ids = [];
    const tokens = Math.ceil((CONTEXT_WINDOW * pct) / 100);
    levelNote(
      {
        hook_event_name: "UserPromptSubmit",
        session_id: "s",
        transcript_path: "/t/s.jsonl",
      },
      {
        read: () => [{ message: { usage: { input_tokens: tokens } } }],
        env: {},
        now: NOW,
        usage: null,
        claim: (_, id) => Boolean(ids.push(id)),
      },
    );
    return ids;
  };
  expect(claimed(CONTEXT_NOTICE_AT)).not.toContain(HANDOFF_MARK);
  expect(claimed(CONTEXT_HANDOFF_AT)).toContain(HANDOFF_MARK);
});
