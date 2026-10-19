// The cold handoff (task 3.11, D47): after the cache TTL, the handoff needs no model call.
// The TTL of a root session is 1 hour, which Claude Code picks with `CLAUDE_CODE_PROMPT_CACHE_TTL`.
// A subagent compaction goes to the built-in one, so only the root TTL counts.

import { expect, test } from "bun:test";
import type { SessionMessage } from "claude-code";
import {
  coldHandoff,
  isCold,
} from "../../../plugins/claudetto/slices/handoff/cold.ts";
import {
  compactedMessages,
  handedText,
} from "../../../plugins/claudetto/slices/handoff/compact.ts";
import { CACHE_TTL_MS } from "../../../plugins/claudetto/slices/handoff/limits.ts";
import { SNIPPET } from "../../../plugins/claudetto/snippets.ts";

const edit = (file_path: string) => ({
  tool_use_id: "t",
  tool: "Edit",
  input: { file_path },
});

const messages = [
  { role: "user", text: "Build the export.", toolUses: [] },
  {
    role: "assistant",
    text: "",
    toolUses: [edit("src/a.ts"), edit("src/b.ts")],
  },
  { role: "user", text: "", toolUses: [], toolResults: [] },
  { role: "assistant", text: "", toolUses: [edit("src/a.ts")] },
  { role: "user", text: "Use `csv`, not JSON.", toolUses: [] },
] as unknown as SessionMessage[];

test("the TTL of a root session is 1 hour", () => {
  expect(CACHE_TTL_MS).toBe(3_600_000);
});

test("a root session is cold after 1 hour", () => {
  const minute = 60_000;
  expect(isCold(30 * minute, 0)).toBe(false);
  expect(isCold(61 * minute, 0)).toBe(true);
});

test("a session with no request seen is cold, because it was resumed", () => {
  expect(isCold(0, null)).toBe(true);
});

test("the cold handoff names the task, each changed file once, and the last words of the user", () => {
  const text = coldHandoff(messages);
  expect(text).toContain("Build the export.");
  expect(text).toContain("`src/a.ts`, `src/b.ts`");
  expect(text).toContain("> Use `csv`, not JSON.");
});

test("after an earlier compaction, the task is the original first message and the earlier handoff stays whole", () => {
  const earlier = `${"- Long step.\n".repeat(200)}- Last \`step\`.`;
  const wrapper = compactedMessages(
    [
      { role: "user", text: "Build the export.", toolUses: [] },
      { role: "assistant", text: "Ok.", toolUses: [] },
    ] as unknown as SessionMessage[],
    handedText("h.md", earlier),
    1_000_000,
  )?.[0] as SessionMessage;
  const text = coldHandoff([
    wrapper,
    { role: "assistant", text: "Ok.", toolUses: [] },
    { role: "user", text: "Use `csv`.", toolUses: [] },
  ] as unknown as SessionMessage[]);
  expect(text).toContain("Task: Build the export.");
  expect(text).toContain(earlier);
  expect(text.match(/Build the export\./g)).toHaveLength(1);
  expect(text).toContain("> Use `csv`.");
  expect(text).not.toContain("> The first message of the user");
});

test("the settings snippet gives a 1-hour cache to the main conversation", () => {
  expect(JSON.stringify(SNIPPET)).toContain(
    '"CLAUDE_CODE_PROMPT_CACHE_TTL":"1h"',
  );
});
