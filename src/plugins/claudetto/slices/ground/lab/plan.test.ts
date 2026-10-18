// Lab tests of the `tool.call` hook of the `ground` slice: the deny of a plan or a spec with a claim that has no source.
// The stubs answer the session and the file system, and no command runs.

import type { On, SessionMessage } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { UNSOURCED } from "../prompts.ts";

const user = (text: string): SessionMessage => ({
  role: "user",
  text,
  toolUses: [],
});

/** Stubs the session with `messages` and the file system with no file. */
const project = (on: On, messages: SessionMessage[] = []) => {
  on("tool.call", () => ({ result: "ok" }));
  on("session.cwd", () => ({ value: "/p" }));
  on("session.messages", () => ({ value: messages }));
  on("fs.exists", () => ({ value: false }));
};

const plan = ($: Engine, content: string) =>
  $.tool.call({
    tool: "Write",
    file_path: "/p/openspec/changes/c/design.md",
    content,
  });

test("a claim with no source is denied with the three ways out", async ($: Engine, on: On) => {
  project(on);
  const out = await plan($, "The bound is 9000 lines.");
  const deny = "deny" in out ? out.deny : undefined;
  expect(deny).toContain("`9000`");
  expect(deny).toContain("`(proposed)`");
  expect(deny).toContain("Ask the user");
});

test("a claim that names its source passes", async ($: Engine, on: On) => {
  project(on, [user("The bound is 9000.")]);
  expect("deny" in (await plan($, "The bound is 9000 lines."))).toBe(false);
});

test("a claim marked `(proposed)` passes", async ($: Engine, on: On) => {
  project(on);
  expect("deny" in (await plan($, "The bound is 9000 lines (proposed)."))).toBe(
    false,
  );
});

test("a write of another file is not checked", async ($: Engine, on: On) => {
  project(on);
  const out = await $.tool.call({
    tool: "Write",
    file_path: "/p/src/a.ts",
    content: "9000",
  });
  expect("deny" in out).toBe(false);
});

test("a retry is denied again when the deny is in the tool results", async ($: Engine, on: On) => {
  const reason = UNSOURCED({ claims: "- `9000` is in no user message." });
  const row = {
    role: "user",
    text: "",
    toolUses: [],
    toolResults: [{ tool_use_id: "t", text: reason, isError: true }],
  } as unknown as SessionMessage;
  project(on, [user("Go."), row]);
  expect("deny" in (await plan($, "The bound is 9000 lines."))).toBe(true);
});
