// Tests of `dotclaude-start` (task 9.0, 9.1, 10.6, 10.13): the readers run on small transcripts built in a temp folder.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { reportOf } from "../../../plugins/dotclaude-sessions/features/start/cli.mjs";
import {
  attachmentSizes,
  checkBudget,
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
import { START_TOKENS } from "../../../tools/limits.mjs";
import { tmpDir } from "../../support/repo.mjs";

const usage = (input, create, read) => ({
  input_tokens: input,
  cache_creation_input_tokens: create,
  cache_read_input_tokens: read,
});
const assistant = (id, u, content = []) => ({
  type: "assistant",
  message: { id, usage: u, content },
});
const call = (id, name, input) => ({
  type: "assistant",
  message: { id: `m-${id}`, content: [{ type: "tool_use", id, name, input }] },
});
const result = (id, content) => ({
  type: "user",
  message: { content: [{ type: "tool_result", tool_use_id: id, content }] },
});

function folder() {
  return tmpDir("measure");
}
function write(file, entries) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(
    file,
    `${entries.map((e) => JSON.stringify(e)).join("\n")}\n`,
  );
}

test("the first request sums input, cache creation, and cache read of the first message", () => {
  const dir = folder();
  const file = path.join(dir, "s.jsonl");
  write(file, [
    assistant("a", usage(2, 12_031, 7_744)),
    assistant("a", usage(2, 12_031, 7_744)),
    assistant("b", usage(3, 100, 20_000)),
  ]);
  assert.equal(firstRequest(readEntries(file)).total, 19_777);
});

test("a message with no tokens does not count as the first request", () => {
  const dir = folder();
  const file = path.join(dir, "s.jsonl");
  write(file, [assistant("s", usage(0, 0, 0)), assistant("a", usage(1, 2, 3))]);
  assert.equal(firstRequest(readEntries(file)).total, 6);
});

const TOOLS = [
  { name: "Bash", description: "x".repeat(10) },
  { name: "Read", description: "y" },
];
const SNAPSHOT_ENTRIES = [
  { attachment: { type: "prompt_snapshot", systemPrompt: ["abc"] } },
  {
    attachment: {
      type: "prompt_snapshot",
      systemPrompt: ["abc", "de"],
      tools: TOOLS,
    },
  },
  { attachment: { type: "date", date: "2026-10-08" } },
  { attachment: { type: "date", date: "2026-10-09" } },
];

test("the snapshot sizes the tools of the newest snapshot", () => {
  const snap = snapshotSizes(SNAPSHOT_ENTRIES);
  assert.equal(snap.toolChars, JSON.stringify(TOOLS).length);
  assert.deepEqual(
    snap.tools.map((t) => t.name),
    ["Bash", "Read"],
  );
});

test("the snapshot sizes the system blocks of the newest snapshot", () => {
  const snap = snapshotSizes(SNAPSHOT_ENTRIES);
  assert.deepEqual(
    snap.systemBlocks.map((b) => b.chars),
    [3, 2],
  );
});

test("the attachments are counted by type", () => {
  const [date] = attachmentSizes(SNAPSHOT_ENTRIES);
  assert.partialDeepStrictEqual(date, { type: "date", count: 2 });
});

test("the budget passes at the bound and names the sum, the bound, and the difference above it", () => {
  assert.equal(checkBudget(START_TOKENS, START_TOKENS).ok, true);
  const over = checkBudget(1_100, 1_000);
  assert.equal(over.ok, false);
  assert.ok(over.message.includes("1100"), over.message);
  assert.ok(over.message.includes("1000"), over.message);
  assert.ok(over.message.includes("100"), over.message);
});

test("the report passes at the first request", () => {
  const file = path.join(folder(), "s.jsonl");
  write(file, [assistant("a", usage(1, 500, 500))]);
  assert.equal(reportOf(file, 1_001).ok, true);
});

test("the report fails over a lowered bound and gives the excess", () => {
  const file = path.join(folder(), "s.jsonl");
  write(file, [assistant("a", usage(1, 500, 500))]);
  const over = reportOf(file, 900);
  assert.equal(over.ok, false);
  assert.ok(over.text.includes("101"), over.text);
  assert.ok(over.text.includes("900"), over.text);
});

test("each subagent run gets its requests, final context, and total input", () => {
  const dir = folder();
  const file = path.join(dir, "s.jsonl");
  write(file, [assistant("a", usage(1, 1, 1))]);
  const sub = path.join(dir, "s", "subagents");
  write(path.join(sub, "agent-x1.jsonl"), [
    assistant("r1", usage(1, 100, 0)),
    assistant("r1", usage(1, 100, 0)),
    assistant("r2", usage(1, 0, 300)),
  ]);
  fs.writeFileSync(
    path.join(sub, "agent-x1.meta.json"),
    '{"agentType":"dotclaude:investigator"}',
  );
  write(path.join(sub, "agent-x2.jsonl"), [assistant("r1", usage(5, 5, 5))]);
  const runs = subagentRuns(file);
  assert.equal(runs.length, 2);
  assert.partialDeepStrictEqual(runs[0], {
    agentType: "dotclaude:investigator",
    requests: 2,
    finalContext: 301,
    totalInput: 402,
  });
  assert.partialDeepStrictEqual(runs[1], {
    agentType: "subagent",
    requests: 1,
    finalContext: 15,
  });
});

test("tool results are summed for each tool, with text blocks counted", () => {
  const rows = toolResults([
    call("1", "Bash", { command: "ls" }),
    result("1", "abcd"),
    call("2", "Bash", { command: "ls" }),
    result("2", [{ type: "text", text: "abcdefgh" }]),
    call("3", "Read", { file_path: "/a/b.md" }),
    result("3", "xy"),
  ]);
  assert.deepEqual(rows, [
    { tool: "Bash", count: 2, chars: 12, largest: 8 },
    { tool: "Read", count: 1, chars: 2, largest: 2 },
  ]);
});

test("a read of a file name seen before is a repeat, whether through `Read` or a `Bash` print", () => {
  const rr = repeatReads([
    call("1", "Read", { file_path: "/p/design.md" }),
    call("2", "Bash", { command: "cd /p && sed -n '40,80p' design.md" }),
    call("3", "Bash", { command: "cat tasks.md | head -5" }),
    call("4", "Bash", { command: "grep -n D22 design.md | head -5" }),
    call("5", "Bash", { command: "sed -i '' 's/a/b/' design.md" }),
    call("6", "Bash", { command: "head -3 tasks.md" }),
  ]);
  assert.partialDeepStrictEqual(rr, { reads: 4, repeats: 2 });
  assert.deepEqual(rr.most[0], ["design.md", 2]);
});

test("a `cat` that writes through a redirect or a heredoc reads no file, and the file it reads before `>` counts", () => {
  const rr = repeatReads([
    call("1", "Bash", { command: "cat >> probes.md <<'EOF'\nline\nEOF" }),
    call("2", "Bash", { command: "cat > notes.md << EOF\nx\nEOF" }),
    call("3", "Bash", { command: "cat a.md > b.md" }),
    call("4", "Bash", { command: "cat a.md 2>&1" }),
  ]);
  assert.partialDeepStrictEqual(rr, { reads: 2, repeats: 1 });
  assert.deepEqual(rr.most, [["a.md", 2]]);
});

test("the bytes of the first request text count system blocks and attachments before the first user turn, and not tools", () => {
  const entries = [
    {
      attachment: {
        type: "prompt_snapshot",
        systemPrompt: ["abc", "dé"],
        tools: [{ name: "Bash", description: "x".repeat(500) }],
      },
    },
    { attachment: { type: "date", date: "2026-10-09" } },
    { type: "user", isMeta: true, message: { content: "meta" } },
    { type: "user", message: { content: "a later prompt" } },
    { attachment: { type: "date", date: "2026-10-10" } },
  ];
  // "abc" 3 + "dé" 3 (the "é" has 2 bytes) + "date" 4 + "2026-10-09" 10 + "meta" 4.
  assert.equal(firstRequestBytes(entries), 3 + 3 + 14 + 4);
  assert.equal(firstRequestBytes([]), null);
});
