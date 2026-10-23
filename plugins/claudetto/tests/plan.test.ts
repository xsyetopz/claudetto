// Lab tests of the `tool.call` hook of the `ground` slice: the deny of a plan or a spec with a claim that has no source.
import type { On, SessionMessage } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { UNSOURCED } from "../slices/ground/prompts.ts";
import { HANDOVER_RESUME } from "../slices/handoff/prompts.ts";

const SUB = "a1";
const user = (text: string): SessionMessage => ({
  role: "user",
  text,
  toolUses: [],
});

const used = (
  tool: string,
  input: Record<string, unknown>,
  text: string,
): SessionMessage => ({
  role: "assistant",
  text: "",
  toolUses: [{ tool_use_id: "t", tool, input, text }],
});

/** Stubs the session with `main`, the transcript of the subagent `SUB` with `sub`, and the file system with no file. */
const project = (on: On, main: SessionMessage[] = [], sub = main) => {
  on("tool.call", () => ({ result: "ok" }));
  on("session.cwd", () => ({ value: "/p" }));
  on("session.messages", (_$, e) => ({
    value: e.agentId === SUB ? sub : main,
  }));
  on("fs.exists", () => ({ value: false }));
};

/** A write of `content` to `file` in the change `c`, by the subagent `agentId` or the main thread. */
const note = (
  $: Engine,
  content: string,
  agentId?: string,
  file = "openspec/changes/c/design.md",
) =>
  $.tool.call({
    tool: "Write",
    file_path: `/p/${file}`,
    content,
    ...(agentId === undefined ? {} : { agentId }),
  });

const denied = async (...a: Parameters<typeof note>) =>
  "deny" in (await note(...a));

test("a claim with no source is denied with the three ways out", async ($: Engine, on: On) => {
  project(on);
  const out = await note($, "The bound is 9000 lines.");
  const deny = "deny" in out ? out.deny : undefined;
  for (const part of ["`9000`", "`(proposed)`", "Ask the user"])
    expect(deny).toContain(part);
});

test("a claim that names its source passes", async ($: Engine, on: On) => {
  project(on, [user("The bound is 9000.")]);
  expect(await denied($, "The bound is 9000 lines.")).toBe(false);
});

test("a claim marked `(proposed)` passes", async ($: Engine, on: On) => {
  project(on);
  expect(await denied($, "The bound is 9000 lines (proposed).")).toBe(false);
});

test("a write of another file is not checked", async ($: Engine, on: On) => {
  project(on);
  expect(await denied($, "9000", undefined, "src/a.ts")).toBe(false);
});

test("a retry is denied again when the deny is in the tool results", async ($: Engine, on: On) => {
  const reason = UNSOURCED({ claims: "- `9000` is in no user message." });
  const row = {
    ...user(""),
    toolResults: [{ tool_use_id: "t", text: reason, isError: true }],
  } as SessionMessage;
  project(on, [user("Go."), row]);
  expect(await denied($, "The bound is 9000 lines.")).toBe(true);
});

test("Subagent Counts", async ($: Engine, on: On) => {
  const jq = used("Bash", { command: "jq length sessions.json" }, "292");
  project(on, [user("Go.")], [jq]);
  expect(await denied($, "292 session files", SUB)).toBe(false);
  expect(await denied($, "292 session files")).toBe(true);
});

test("Number with No Source", async ($: Engine, on: On) => {
  project(on, [user("Go.")], [user("Count the files.")]);
  const out = await note($, "There are 292 session files.", SUB);
  expect("deny" in out ? out.deny : "").toContain("`292`");
});

test("Chosen Option", async ($: Engine, on: On) => {
  const text = 'User has answered your questions: "Permit the call?"="Allow".';
  project(on, [user("Go."), used("AskUserQuestion", {}, text)]);
  expect(await denied($, "The user chose Allow.")).toBe(false);
  expect(await denied($, "The user chose Refuse.")).toBe(true);
});

test("Spec Scenario", async ($: Engine, on: On) => {
  project(on);
  const spec = "openspec/changes/c/specs/x/spec.md";
  const scenario = "#### Scenario: Big\n\n- **WHEN** a file has 292 lines";
  expect(await denied($, scenario, undefined, spec)).toBe(false);
  const after = `${scenario}\n\n### Requirement: R\n\n292`; // The heading ends the block.
  expect(await denied($, after, undefined, spec)).toBe(true);
});

test("an unreadable subagent transcript lets the call run", async ($: Engine, on: On) => {
  project(on, { deny: "gone" } as never);
  expect(await denied($, "292 files", SUB)).toBe(false);
});

test("the handoff text is a source in any role", async ($: Engine, on: On) => {
  const resume = HANDOVER_RESUME({ path: "h.md" });
  expect(resume.startsWith("This is the handoff of the earlier")).toBe(true);
  const text = `${resume}\n- The cap is 9000.`;
  project(on, [{ role: "assistant", text, toolUses: [] }]);
  expect(await denied($, "The cap is 9000.")).toBe(false);
});
