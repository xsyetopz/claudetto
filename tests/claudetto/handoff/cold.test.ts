// The cold handoff (task 3.11, D47): after the cache TTL, the handoff needs no model call.
// The TTL of a root session is 1 hour and the TTL of a subagent is 5 minutes.
// Claude Code picks the TTL with `CLAUDE_CODE_PROMPT_CACHE_TTL` for the main conversation
// and with `CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL` for the other requests.

import { expect, test } from "bun:test";
import type { SessionMessage } from "claude-code";
import {
  coldHandoff,
  isCold,
} from "../../../plugins/claudetto/slices/handoff/cold.ts";
import {
  CACHE_TTL_MS,
  SUBAGENT_CACHE_TTL_MS,
} from "../../../plugins/claudetto/slices/handoff/limits.ts";
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

test("the TTL of a root session is 1 hour and the TTL of a subagent is 5 minutes", () => {
  expect(CACHE_TTL_MS).toBe(3_600_000);
  expect(SUBAGENT_CACHE_TTL_MS).toBe(300_000);
});

test("a root session is cold after 1 hour and a subagent after 5 minutes", () => {
  const minute = 60_000;
  expect(isCold(30 * minute, 0, false)).toBe(false);
  expect(isCold(61 * minute, 0, false)).toBe(true);
  expect(isCold(4 * minute, 0, true)).toBe(false);
  expect(isCold(6 * minute, 0, true)).toBe(true);
});

test("a session with no turn seen is not cold", () => {
  expect(isCold(10 * CACHE_TTL_MS, null, false)).toBe(false);
});

test("the cold handoff names the task, each changed file once, and the last words of the user", () => {
  const text = coldHandoff(messages);
  expect(text).toContain("Build the export.");
  expect(text).toContain("`src/a.ts`, `src/b.ts`");
  expect(text).toContain("> Use `csv`, not JSON.");
});

test("the settings snippet gives a 1-hour cache to the main conversation", () => {
  expect(JSON.stringify(SNIPPET)).toContain(
    '"CLAUDE_CODE_PROMPT_CACHE_TTL":"1h"',
  );
});
