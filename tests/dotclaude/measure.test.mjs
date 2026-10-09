// Tests of `just measure` (task 9.0, 9.1, 10.6, 10.13): the readers run on small transcripts built in a temp folder.

import { expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { START_TOKENS } from "../../tools/limits.mjs";
import {
  attachmentSizes,
  checkBudget,
  firstRequest,
  firstRequestBytes,
  snapshotSizes,
} from "../../tools/measure/start.mjs";
import { readEntries } from "../../tools/measure/transcript.mjs";
import {
  repeatReads,
  subagentRuns,
  toolResults,
} from "../../tools/measure/usage.mjs";
import { reportOf } from "../../tools/measure.mjs";

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
  return fs.mkdtempSync(path.join(os.tmpdir(), "measure-"));
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
  expect(firstRequest(readEntries(file)).total).toBe(19_777);
});

test("a message with no tokens does not count as the first request", () => {
  const dir = folder();
  const file = path.join(dir, "s.jsonl");
  write(file, [assistant("s", usage(0, 0, 0)), assistant("a", usage(1, 2, 3))]);
  expect(firstRequest(readEntries(file)).total).toBe(6);
});

test("the snapshot sizes the tools, the system blocks, and the attachments", () => {
  const tools = [
    { name: "Bash", description: "x".repeat(10) },
    { name: "Read", description: "y" },
  ];
  const entries = [
    { attachment: { type: "prompt_snapshot", systemPrompt: ["abc"] } },
    {
      attachment: {
        type: "prompt_snapshot",
        systemPrompt: ["abc", "de"],
        tools,
      },
    },
    { attachment: { type: "date", date: "2026-10-08" } },
    { attachment: { type: "date", date: "2026-10-09" } },
  ];
  const snap = snapshotSizes(entries);
  expect(snap.toolChars).toBe(JSON.stringify(tools).length);
  expect(snap.tools.map((t) => t.name)).toEqual(["Bash", "Read"]);
  expect(snap.systemBlocks.map((b) => b.chars)).toEqual([3, 2]);
  const [date] = attachmentSizes(entries);
  expect(date).toMatchObject({ type: "date", count: 2 });
});

test("the budget passes at the bound and names the sum, the bound, and the difference above it", () => {
  expect(checkBudget(START_TOKENS, START_TOKENS).ok).toBe(true);
  const over = checkBudget(1_100, 1_000);
  expect(over.ok).toBe(false);
  expect(over.message).toContain("1100");
  expect(over.message).toContain("1000");
  expect(over.message).toContain("100");
});

test("the committed baseline is at or below `START_TOKENS`, and fails a lowered bound", () => {
  const baseline = JSON.parse(
    fs.readFileSync(
      path.join(import.meta.dirname, "../../tools/baseline.json"),
      "utf8",
    ),
  );
  expect(checkBudget(baseline.total, START_TOKENS).ok).toBe(true);
  expect(checkBudget(baseline.total, baseline.total - 1).ok).toBe(false);
});

test("the report fails over a lowered bound and passes at the first request", () => {
  const dir = folder();
  const file = path.join(dir, "s.jsonl");
  write(file, [assistant("a", usage(1, 500, 500))]);
  expect(reportOf(file, 1_001).ok).toBe(true);
  const over = reportOf(file, 900);
  expect(over.ok).toBe(false);
  expect(over.text).toContain("over the bound 900 by 101");
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
  expect(runs).toHaveLength(2);
  expect(runs[0]).toMatchObject({
    agentType: "dotclaude:investigator",
    requests: 2,
    finalContext: 301,
    totalInput: 402,
  });
  expect(runs[1]).toMatchObject({
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
  expect(rows).toEqual([
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
  expect(rr).toMatchObject({ reads: 4, repeats: 2 });
  expect(rr.most[0]).toEqual(["design.md", 2]);
});

test("a `cat` that writes through a redirect or a heredoc reads no file, and the file it reads before `>` counts", () => {
  const rr = repeatReads([
    call("1", "Bash", { command: "cat >> probes.md <<'EOF'\nline\nEOF" }),
    call("2", "Bash", { command: "cat > notes.md << EOF\nx\nEOF" }),
    call("3", "Bash", { command: "cat a.md > b.md" }),
    call("4", "Bash", { command: "cat a.md 2>&1" }),
  ]);
  expect(rr).toMatchObject({ reads: 2, repeats: 1 });
  expect(rr.most).toEqual([["a.md", 2]]);
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
  expect(firstRequestBytes(entries)).toBe(3 + 3 + 14 + 4);
  expect(firstRequestBytes([])).toBeNull();
});
