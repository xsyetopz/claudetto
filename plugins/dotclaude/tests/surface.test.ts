// Lab tests of the prompt surface hooks: `prompt.attachment`, `agent.offer`, and `tool.describe`.
// The hooks under test sit above the stub of the engine, so the stub answers `next(e)`.
// The event shapes follow `claude-code.d.ts` of 2.1.296.

import type { On, Settings } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

const ORIGIN = { kind: "engine" } as const;
const CORE = { plugin: "engine", tier: "core" } as const;
const FULL_SANDBOX = `${"The sandbox allows these paths and hosts. ".repeat(40)}Set dangerouslyDisableSandbox to run a command outside it.`;
const AUTO_FULL = `${"Auto mode is active. Execute immediately and minimize interruptions. ".repeat(6)}`;
const SESSION_FULL = [
  "# userEmail",
  "The user's email address is me@example.com.",
  "# gitStatus",
  "Current branch: main",
  "",
  "Status:",
  "?? notes.md",
  "",
  "Recent commits:",
  "abc1234 first",
  "def5678 second",
  "# currentDate",
  "Today's date is 2026-10-08.",
].join("\n");

function engine(
  on: On,
  { text, sandbox }: { text: string; sandbox?: Settings["sandbox"] },
) {
  on("prompt.attachment", () => ({ text }));
  on("settings.read", () => ({ value: sandbox ? { sandbox } : {} }));
}

const attach = ($: Engine, type: string, text: string) =>
  $.prompt.attachment({ type, text, origin: ORIGIN });

test("the sandbox text is shorter when the sandbox has no escape", async ($: Engine, on: On) => {
  engine(on, {
    text: FULL_SANDBOX,
    sandbox: { enabled: true, allowUnsandboxedCommands: false },
  });
  const out = await attach($, "sandbox_instructions", FULL_SANDBOX);
  expect(out.text?.length).toBeLessThan(FULL_SANDBOX.length);
});

test("the sandbox text is shorter when the sandbox can be escaped", async ($: Engine, on: On) => {
  engine(on, {
    text: FULL_SANDBOX,
    sandbox: { allowUnsandboxedCommands: true },
  });
  const out = await attach($, "sandbox_instructions", FULL_SANDBOX);
  expect(out.text?.length).toBeLessThan(FULL_SANDBOX.length);
});

test("the sandbox text stays whole when the escape setting is missing", async ($: Engine, on: On) => {
  engine(on, { text: FULL_SANDBOX, sandbox: { enabled: true } });
  expect((await attach($, "sandbox_instructions", FULL_SANDBOX)).text).toBe(
    FULL_SANDBOX,
  );
});

test("the sandbox text stays whole when the settings have no sandbox key", async ($: Engine, on: On) => {
  engine(on, { text: FULL_SANDBOX });
  expect((await attach($, "sandbox_instructions", FULL_SANDBOX)).text).toBe(
    FULL_SANDBOX,
  );
});

test("the auto mode text is shorter", async ($: Engine, on: On) => {
  engine(on, { text: AUTO_FULL });
  const out = await attach($, "auto_mode", AUTO_FULL);
  expect(out.text?.length).toBeLessThan(AUTO_FULL.length);
});

test("a text that is already short is not made longer", async ($: Engine, on: On) => {
  engine(on, { text: "Auto mode." });
  expect((await attach($, "auto_mode", "Auto mode.")).text).toBe("Auto mode.");
});

test("the session context loses the commit list and keeps the other sections", async ($: Engine, on: On) => {
  engine(on, { text: SESSION_FULL });
  const out = await attach($, "session_context", SESSION_FULL);
  expect(out.text).not.toContain("abc1234");
  expect(out.text).toContain("me@example.com");
  expect(out.text).toContain("# currentDate");
});

test("an unknown attachment type passes on with no change", async ($: Engine, on: On) => {
  engine(on, { text: "x".repeat(500) });
  for (const type of ["skill_listing", "environment", "date", "something_new"])
    expect((await attach($, type, "x".repeat(500))).text).toBe("x".repeat(500));
});

const offer = ($: Engine, agent: string) =>
  $.agent.offer({
    agent,
    description: "d",
    source: "built-in",
    provider: CORE,
  });

test("`agent.offer` leaves out the built-in agents that the profile does not use", async ($: Engine, on: On) => {
  on("agent.offer", () => ({ isOffered: true }));
  for (const agent of ["claude-code-guide", "statusline-setup"])
    expect((await offer($, agent)).isOffered).toBe(false);
});

test("`agent.offer` keeps the other agents, and the dotclaude agents", async ($: Engine, on: On) => {
  on("agent.offer", () => ({ isOffered: true }));
  for (const agent of ["claude", "dotclaude:investigator", "something_new"])
    expect((await offer($, agent)).isOffered).toBe(true);
});

test("`agent.offer` gives the engine answer with no text for an agent that stays", async ($: Engine, on: On) => {
  on("agent.offer", () => ({ isOffered: true }));
  expect(await offer($, "claude")).toEqual({ isOffered: true });
});

const describe = ($: Engine, tool: string, description = "x".repeat(4000)) =>
  $.tool.describe({ tool, description, provider: CORE });

test("`tool.describe` defers the tools of the 2.19 list and never sets `isDeferred` to `false`", async ($: Engine, on: On) => {
  on("tool.describe", (_$, e) => ({ description: e.description }));
  for (const tool of ["AskUserQuestion", "ListAgents"])
    expect((await describe($, tool)).isDeferred).toBe(true);
  for (const tool of ["Bash", "Read", "Edit", "Write", "Skill", "SomethingNew"])
    expect((await describe($, tool)).isDeferred).not.toBe(false);
  expect((await describe($, "Edit")).isDeferred).toBeUndefined();
});

test("`tool.describe` shortens `Agent`, `Bash`, and `Read` by name and keeps the rest", async ($: Engine, on: On) => {
  on("tool.describe", (_$, e) => ({ description: e.description }));
  for (const tool of ["Agent", "Bash", "Read"]) {
    const out = await describe($, tool);
    expect(out.description.length).toBeLessThan(4000);
    expect(out.isDeferred).toBeUndefined();
  }
  expect((await describe($, "Edit")).description).toBe("x".repeat(4000));
});

test("`tool.describe` does not replace a description that is shorter than the new text", async ($: Engine, on: On) => {
  on("tool.describe", (_$, e) => ({ description: e.description }));
  expect((await describe($, "Bash", "Runs a command.")).description).toBe(
    "Runs a command.",
  );
});

test("`tool.describe` keeps a tool that the engine already defers", async ($: Engine, on: On) => {
  on("tool.describe", (_$, e) => ({
    description: e.description,
    isDeferred: true,
  }));
  expect((await describe($, "WebFetch")).isDeferred).toBe(true);
});

const AGENT_LISTING = [
  "Available agent types for the Agent tool:",
  "- dotclaude:investigator: Answers a question from several files, read-only, with sources. (Tools: Bash, Read)",
  "- dotclaude:reviewer: Reviews code, read-only, with a fresh context. (Tools: Read, Grep)",
  "",
  "When you launch multiple agents for independent work, send them in a single message with multiple tool uses so they run concurrently.",
].join("\n");

test("the agent listing keeps each agent line and shortens only the concurrency note", async ($: Engine, on: On) => {
  engine(on, { text: AGENT_LISTING });
  const out = await attach($, "agent_listing_delta", AGENT_LISTING);
  expect(out.text?.length).toBeLessThan(AGENT_LISTING.length);
  for (const line of AGENT_LISTING.split("\n").slice(0, 3))
    expect(out.text).toContain(line);
});

test("an agent listing with no concurrency note passes on with no change", async ($: Engine, on: On) => {
  const text = AGENT_LISTING.split("\n").slice(0, 3).join("\n");
  engine(on, { text });
  expect((await attach($, "agent_listing_delta", text)).text).toBe(text);
});

test("the skill listing and the environment text pass on with no change, because the profile keeps setup and the facts", async ($: Engine, on: On) => {
  const skills = "- dotclaude:setup: Sets up OpenSpec.\n- plugin-authoring";
  engine(on, { text: skills });
  expect((await attach($, "skill_listing", skills)).text).toBe(skills);
  expect((await attach($, "environment", skills)).text).toBe(skills);
});
