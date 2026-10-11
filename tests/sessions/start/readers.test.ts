// Tests of the readers in `features/start/first.ts` and `features/start/session.ts` of `dotclaude-sessions` (task 28.4).
// `tests/sessions/measure.test.mjs` pins the main path.
// These tests pin the edges, and each one reads a small `.jsonl` transcript written to a temp folder.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
  attachmentSizes,
  firstRequest,
  firstRequestBytes,
  type Snapshot,
  snapshotSizes,
} from "../../../plugins/dotclaude-sessions/features/start/first.ts";
import {
  repeatReads,
  subagentRuns,
  toolResults,
} from "../../../plugins/dotclaude-sessions/features/start/session.ts";
import {
  readEntries,
  type Usage,
} from "../../../plugins/dotclaude-sessions/lib/transcript.ts";
import { tmpDir } from "../../support/repo.ts";

const dir = () => tmpDir("readers");
const writeJsonl = async (file: string, lines: unknown[]) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await Bun.write(
    file,
    lines
      .map((l) => (typeof l === "string" ? l : JSON.stringify(l)))
      .join("\n"),
  );
};
const reply = (id: string, usage: Usage) => ({
  type: "assistant",
  message: { id, usage, content: [] },
});
const use = (id: string, name: string, input: Record<string, unknown>) => ({
  type: "assistant",
  message: { id: `m${id}`, content: [{ type: "tool_use", id, name, input }] },
});
const back = (id: string, content: unknown) => ({
  type: "user",
  message: { content: [{ type: "tool_result", tool_use_id: id, content }] },
});
const read = async (entries: unknown[]) => {
  const file = path.join(dir(), "s.jsonl");
  await writeJsonl(file, entries);
  return await readEntries(file);
};

test("the first request is null when the transcript has no usage, and a cut line does not hide the next", async () => {
  expect(firstRequest(await read([{ type: "user", message: {} }]))).toBe(null);
  const entries = await read([
    '{"type":"assistant","message":{"id":"a","usa',
    "",
    reply("b", { input_tokens: 4, cache_read_input_tokens: 6 }),
  ]);
  expect(firstRequest(entries)).toStrictEqual({
    input_tokens: 4,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 6,
    total: 10,
  });
});

test("the snapshot falls back to the first snapshot when none has tools, and is null with none", async () => {
  expect(snapshotSizes(await read([{ type: "user" }]))).toBe(null);
  const snap = snapshotSizes(
    await read([
      {
        attachment: {
          type: "prompt_snapshot",
          systemPrompt: ["  a\n  b  c "],
        },
      },
    ]),
  ) as Snapshot;
  expect(snap.toolChars).toBe(2);
  expect(snap.tools).toStrictEqual([]);
  // The head folds white space, and the size counts the text as written.
  expect(snap.systemBlocks).toStrictEqual([
    { head: "a b c", chars: 11, bytes: 11 },
  ]);
});

test("attachment sizes leave out the snapshot and list the largest type first", async () => {
  const small = { type: "date", date: "d" };
  const big = { type: "listing", text: "x".repeat(50) };
  const rows = attachmentSizes(
    await read([
      { attachment: { type: "prompt_snapshot", systemPrompt: ["s"] } },
      { attachment: small },
      { attachment: big },
      { attachment: small },
      { type: "user" },
    ]),
  );
  expect(rows).toStrictEqual([
    { type: "listing", count: 1, chars: JSON.stringify(big).length },
    { type: "date", count: 2, chars: 2 * JSON.stringify(small).length },
  ]);
});

test("the first request text stops at the first user entry that is not meta, and is null without a snapshot", async () => {
  const entries = await read([
    { attachment: { type: "prompt_snapshot", systemPrompt: ["abcd"] } },
    { attachment: { type: "env", cwd: "/p" } },
    { type: "user", message: { content: "go" } },
    { attachment: { type: "env", cwd: "/much/later" } },
  ]);
  expect(firstRequestBytes(entries)).toBe(4 + 3 + 2);
  expect(firstRequestBytes(await read([{ attachment: { type: "env" } }]))).toBe(
    null,
  );
});

test("a session with no subagent folder has no runs, and a run with no request has zero context", async () => {
  const root = dir();
  const file = path.join(root, "s.jsonl");
  await writeJsonl(file, [reply("a", { input_tokens: 1 })]);
  expect(await subagentRuns(file)).toStrictEqual([]);
  const sub = path.join(root, "s", "subagents");
  await writeJsonl(path.join(sub, "agent-e1.jsonl"), [{ type: "user" }]);
  await writeJsonl(path.join(sub, "agent-e1.notes.txt"), ["not a transcript"]);
  await Bun.write(path.join(sub, "agent-e1.meta.json"), "{ cut");
  expect(await subagentRuns(file)).toStrictEqual([
    {
      id: "e1",
      agentType: "subagent",
      requests: 0,
      finalContext: 0,
      totalInput: 0,
    },
  ]);
});

test("a subagent run counts the first record of each message id and the last request as the final context", async () => {
  const root = dir();
  const file = path.join(root, "s.jsonl");
  await writeJsonl(file, []);
  const sub = path.join(root, "s", "subagents");
  await writeJsonl(path.join(sub, "agent-b.jsonl"), [
    reply("r1", { input_tokens: 10 }),
    reply("r1", { input_tokens: 99 }),
    reply("r2", { input_tokens: 5, cache_read_input_tokens: 5 }),
    reply("r3", { input_tokens: 0 }),
  ]);
  const [run] = await subagentRuns(file);
  expect(run).toMatchObject({
    requests: 2,
    finalContext: 10,
    totalInput: 20,
  });
});

test("tool results of a call with no record count under `unknown`, and a result with no text counts zero", async () => {
  const rows = toolResults(
    await read([
      use("1", "Grep", {}),
      back("1", [{ type: "image" }]),
      back("lost", "abc"),
    ]),
  );
  expect(rows).toStrictEqual([
    { tool: "unknown", count: 1, chars: 3, largest: 3 },
    { tool: "Grep", count: 1, chars: 0, largest: 0 },
  ]);
});

test("a tool result entry whose content is a string is not read as blocks", async () => {
  expect(
    toolResults(await read([{ type: "user", message: { content: "plain" } }])),
  ).toStrictEqual([]);
});

test("repeat reads match by file name across folders and leave out globs, flags, and `sed` without `-n`", async () => {
  const rr = repeatReads(
    await read([
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
  expect(rr).toMatchObject({ reads: 3, repeats: 1 });
  expect(rr.most).toStrictEqual([
    ["notes.md", 2],
    ["log.txt", 2],
  ]);
});

test("the list of most-read files holds at most five names", async () => {
  const calls: unknown[] = [];
  for (let round = 0; round < 2; round += 1)
    for (let i = 0; i < 7; i += 1)
      calls.push(use(`${round}-${i}`, "Read", { file_path: `/p/f${i}.md` }));
  const rr = repeatReads(await read(calls));
  expect(rr.reads).toBe(14);
  expect(rr.repeats).toBe(7);
  expect(rr.most.length).toBe(5);
});
