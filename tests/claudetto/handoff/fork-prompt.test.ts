// The fork prompt of a compaction in the middle of a turn (task 17.1, `sandbox-handoff-301.md`).
// The fork cannot see the results of the last tool calls, so the prompt forbids a result or an error for them.

import { expect, test } from "bun:test";
import type { SessionMessage } from "claude-code";
import { forkPrompt } from "../../../plugins/claudetto/slices/handoff/compact.ts";
import { RULES } from "../../../plugins/claudetto/slices/handoff/prompts.ts";

const messages = [
  { role: "user", text: "Run `cat b.txt`.", toolUses: [] },
  {
    role: "assistant",
    text: "",
    toolUses: [
      { tool_use_id: "t1", tool: "Bash", input: { command: "cat b.txt" } },
    ],
  },
] as unknown as SessionMessage[];

test("a tail call is a `RAN` step with no claim of its result or its error", () => {
  const prompt = forkPrompt(messages);
  expect(prompt).toContain('"command":"cat b.txt"');
  expect(prompt).toContain("mark it `RAN, result after this handoff`");
  expect(prompt).not.toContain("mark it `DONE`");
  expect(prompt).toContain(
    "do not state a result or an error for them, and do not write that they gave no error",
  );
});

test("a session that ends with a reply and no tool call gets only the rules", () => {
  const ended = [
    ...messages,
    { role: "user", text: "", toolUses: [] },
    { role: "assistant", text: "done", toolUses: [] },
  ] as unknown as SessionMessage[];
  expect(forkPrompt(ended)).toBe(RULES);
});
