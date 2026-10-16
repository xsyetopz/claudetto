// Lab tests of the facts that the handoff file keeps with no model call (`domain/kept.ts`):
// the last user messages word for word, and the files that the session changed.

import type { On, SessionMessage } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

const HANDOFF = "- Read `a.txt`: DONE, line 1 is `amber-falcon-42`.";
const NO_USAGE = {
  input_tokens: 0,
  output_tokens: 0,
  cache_read_input_tokens: 0,
  cache_creation_input_tokens: 0,
};

const user = (text: string, handle: string): SessionMessage => ({
  role: "user",
  text,
  toolUses: [],
  handle,
});
const edit = (tool: string, input: Record<string, unknown>, id: string) => ({
  tool_use_id: id,
  tool,
  input,
});

/** A session that has ended with a reply: 5 user messages, a tool result, and edits of 3 files, with `b.ts` changed two times. */
const MESSAGES: SessionMessage[] = [
  user("Fix the parser.", "h0"),
  user("Never use semicolons.", "h1"),
  user("Keep the tests.", "h2"),
  {
    role: "assistant",
    text: "",
    toolUses: [
      edit("Edit", { file_path: "b.ts" }, "t1"),
      edit("Write", { file_path: "c.ts" }, "t2"),
      edit("Read", { file_path: "r.ts" }, "t3"),
    ],
    handle: "h3",
  },
  { role: "user", text: "", toolUses: [], toolResults: [], handle: "h4" },
  user("Use `bun test`.\nThen stop.", "h5"),
  {
    role: "assistant",
    text: "",
    toolUses: [
      edit("NotebookEdit", { notebook_path: "n.ipynb" }, "t4"),
      edit("MultiEdit", { file_path: "b.ts" }, "t5"),
    ],
    handle: "h6",
  },
  { role: "user", text: "", toolUses: [], toolResults: [], handle: "h7" },
  user("Go on.", "h8"),
  { role: "assistant", text: "Done.", toolUses: [], handle: "h9" },
];

/** The text of the handoff file of a manual compaction of `messages`. */
const written = async ($: Engine, on: On, messages = MESSAGES) => {
  const writes: string[] = [];
  on("model.fork", () => ({
    value: { isAnswered: true, text: HANDOFF, usage: NO_USAGE },
  }));
  on("session.model", () => ({ value: "claude-haiku-5-5" }));
  on("fs.write", (_$, e) => {
    writes.push(e.text);
    return { value: undefined };
  });
  on("fs.stat", () => ({
    value: { kind: "file", size: 100, mtimeMs: 0, isLink: false },
  }));
  on("session.compact", () => ({ skip: "the built-in compaction" }));
  await $.session.compact({ trigger: "manual", messages });
  return writes[0] ?? "";
};

// biome-ignore lint/plugin: a test name
test("the handoff file keeps the last 3 user messages after the first word for word, with no model call", async ($: Engine, on: On) => {
  const text = await written($, on);
  expect(text).toStartWith(`${HANDOFF}\n\n`);
  expect(text).toContain(
    // biome-ignore lint/plugin: test input data
    "> Keep the tests.\n\n> Use `bun test`.\n> Then stop.\n\n> Go on.",
  );
  expect(text).not.toContain("Never use semicolons.");
  expect(text).not.toContain("> Fix the parser.");
});

// biome-ignore lint/plugin: a test name
test("the handoff file lists each changed file one time, in the order of its last change", async ($: Engine, on: On) => {
  const text = await written($, on);
  expect(text).toEndWith("- `c.ts`\n- `n.ipynb`\n- `b.ts`\n");
  expect(text).not.toContain("r.ts");
});

// biome-ignore lint/plugin: a test name
test("a session with one user message and no edit gives the handoff file with nothing kept", async ($: Engine, on: On) => {
  const text = await written($, on, [
    MESSAGES[0] as SessionMessage,
    MESSAGES[9] as SessionMessage,
  ]);
  expect(text).toBe(`${HANDOFF}\n`);
});
