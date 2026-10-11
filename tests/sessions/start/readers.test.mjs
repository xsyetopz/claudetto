// Tests of the readers in `features/start/first.mjs` and `features/start/session.mjs` of `dotclaude-sessions` (task 28.4).
// `tests/sessions/measure.test.mjs` pins the main path.
// These tests pin the edges, and each one reads a small `.jsonl` transcript written to a temp folder.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import {
  attachmentSizes,
  firstRequest,
  firstRequestBytes,
  snapshotSizes,
} from "../../../plugins/dotclaude-sessions/features/start/first.mjs";
import {
  repeatReads,
  subagentRuns,
  toolResults,
} from "../../../plugins/dotclaude-sessions/features/start/session.mjs";
import { readEntries } from "../../../plugins/dotclaude-sessions/lib/transcript.mjs";
import { tmpDir } from "../../support/repo.mjs";

const dir = () => tmpDir("readers");
const writeJsonl = (file, lines) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(
    file,
    lines
      .map((l) => (typeof l === "string" ? l : JSON.stringify(l)))
      .join("\n"),
  );
};
const reply = (id, usage) => ({
  type: "assistant",
  message: { id, usage, content: [] },
});
const use = (id, name, input) => ({
  type: "assistant",
  message: { id: `m${id}`, content: [{ type: "tool_use", id, name, input }] },
});
const back = (id, content) => ({
  type: "user",
  message: { content: [{ type: "tool_result", tool_use_id: id, content }] },
});
const read = (entries) => {
  const file = path.join(dir(), "s.jsonl");
  writeJsonl(file, entries);
  return readEntries(file);
};

test("the first request is null when the transcript has no usage, and a cut line does not hide the next", () => {
  assert.equal(firstRequest(read([{ type: "user", message: {} }])), null);
  const entries = read([
    '{"type":"assistant","message":{"id":"a","usa',
    "",
    reply("b", { input_tokens: 4, cache_read_input_tokens: 6 }),
  ]);
  assert.deepEqual(firstRequest(entries), {
    input_tokens: 4,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 6,
    total: 10,
  });
});

test("the snapshot falls back to the first snapshot when none has tools, and is null with none", () => {
  assert.equal(snapshotSizes(read([{ type: "user" }])), null);
  const snap = snapshotSizes(
    read([
      {
        attachment: {
          type: "prompt_snapshot",
          systemPrompt: ["  a\n  b  c "],
        },
      },
    ]),
  );
  assert.equal(snap.toolChars, 2);
  assert.deepEqual(snap.tools, []);
  // The head folds white space, and the size counts the text as written.
  assert.deepEqual(snap.systemBlocks, [
    { head: "a b c", chars: 11, bytes: 11 },
  ]);
});

test("attachment sizes leave out the snapshot and list the largest type first", () => {
  const small = { type: "date", date: "d" };
  const big = { type: "listing", text: "x".repeat(50) };
  const rows = attachmentSizes(
    read([
      { attachment: { type: "prompt_snapshot", systemPrompt: ["s"] } },
      { attachment: small },
      { attachment: big },
      { attachment: small },
      { type: "user" },
    ]),
  );
  assert.deepEqual(rows, [
    { type: "listing", count: 1, chars: JSON.stringify(big).length },
    { type: "date", count: 2, chars: 2 * JSON.stringify(small).length },
  ]);
});

test("the first request text stops at the first user entry that is not meta, and is null without a snapshot", () => {
  const entries = read([
    { attachment: { type: "prompt_snapshot", systemPrompt: ["abcd"] } },
    { attachment: { type: "env", cwd: "/p" } },
    { type: "user", message: { content: "go" } },
    { attachment: { type: "env", cwd: "/much/later" } },
  ]);
  assert.equal(firstRequestBytes(entries), 4 + 3 + 2);
  assert.equal(
    firstRequestBytes(read([{ attachment: { type: "env" } }])),
    null,
  );
});

test("a session with no subagent folder has no runs, and a run with no request has zero context", () => {
  const root = dir();
  const file = path.join(root, "s.jsonl");
  writeJsonl(file, [reply("a", { input_tokens: 1 })]);
  assert.deepEqual(subagentRuns(file), []);
  const sub = path.join(root, "s", "subagents");
  writeJsonl(path.join(sub, "agent-e1.jsonl"), [{ type: "user" }]);
  writeJsonl(path.join(sub, "agent-e1.notes.txt"), ["not a transcript"]);
  fs.writeFileSync(path.join(sub, "agent-e1.meta.json"), "{ cut");
  assert.deepEqual(subagentRuns(file), [
    {
      id: "e1",
      agentType: "subagent",
      requests: 0,
      finalContext: 0,
      totalInput: 0,
    },
  ]);
});

test("a subagent run counts the first record of each message id and the last request as the final context", () => {
  const root = dir();
  const file = path.join(root, "s.jsonl");
  writeJsonl(file, []);
  const sub = path.join(root, "s", "subagents");
  writeJsonl(path.join(sub, "agent-b.jsonl"), [
    reply("r1", { input_tokens: 10 }),
    reply("r1", { input_tokens: 99 }),
    reply("r2", { input_tokens: 5, cache_read_input_tokens: 5 }),
    reply("r3", { input_tokens: 0 }),
  ]);
  const [run] = subagentRuns(file);
  assert.partialDeepStrictEqual(run, {
    requests: 2,
    finalContext: 10,
    totalInput: 20,
  });
});

test("tool results of a call with no record count under `unknown`, and a result with no text counts zero", () => {
  const rows = toolResults(
    read([
      use("1", "Grep", {}),
      back("1", [{ type: "image" }]),
      back("lost", "abc"),
    ]),
  );
  assert.deepEqual(rows, [
    { tool: "unknown", count: 1, chars: 3, largest: 3 },
    { tool: "Grep", count: 1, chars: 0, largest: 0 },
  ]);
});

test("a tool result entry whose content is a string is not read as blocks", () => {
  assert.deepEqual(
    toolResults(read([{ type: "user", message: { content: "plain" } }])),
    [],
  );
});

test("repeat reads match by file name across folders and leave out globs, flags, and `sed` without `-n`", () => {
  const rr = repeatReads(
    read([
      use("1", "Read", { file_path: "/a/notes.md" }),
      use("2", "Read", { file_path: "/b/notes.md" }),
      use("3", "Bash", { command: "cat *.md" }),
      use("4", "Bash", { command: "sed 's/a/b/' notes.md" }),
      use("5", "Bash", { command: "FOO=1 tail -n 5 log.txt && wc -l log.txt" }),
      use("6", "Read", {}),
      use("7", "Bash", { command: "cat Makefile" }),
    ]),
  );
  // One call is one read, so two prints of `log.txt` in one call are not a repeat.
  assert.partialDeepStrictEqual(rr, { reads: 3, repeats: 1 });
  assert.deepEqual(rr.most, [
    ["notes.md", 2],
    ["log.txt", 2],
  ]);
});

test("the list of most-read files holds at most five names", () => {
  const calls = [];
  for (let round = 0; round < 2; round += 1)
    for (let i = 0; i < 7; i += 1)
      calls.push(use(`${round}-${i}`, "Read", { file_path: `/p/f${i}.md` }));
  const rr = repeatReads(read(calls));
  assert.equal(rr.reads, 14);
  assert.equal(rr.repeats, 7);
  assert.equal(rr.most.length, 5);
});
