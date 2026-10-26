// Lab tests of usage awareness (spec `usage-awareness`, design D25): the usage line of `prompt`, the gate at red of `guard`, and the cost report of the handoff.
// The stubs answer the engine beneath the plugin, and no model runs.

import type { AgentStatus, On, ToolCheckArgs } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";
import { stubState } from "./stubs/process.ts";

type World = {
  /** The status of each running agent. */
  agents: AgentStatus[];
  /** The rate-limit windows that `$.session.usage()` answers, as `[five_hour, seven_day]` percents. */
  shares: [number, number] | null;
  /** The cost in US dollars that `$.session.usage()` answers. */
  usd: number | undefined;
  /** The context tokens that `$.session.usage()` answers. */
  tokens: number;
  /** The text of each file that the hooks wrote. */
  written: string[];
};

const windows = (shares: [number, number] | null) =>
  shares === null
    ? []
    : [
        { kind: "five_hour", percentUsed: shares[0] },
        { kind: "seven_day", percentUsed: shares[1] },
      ];

/** Stubs the engine beneath the hooks. `world` is read at each call, so a test moves the shares. */
const stub = (on: On, init: Partial<World> = {}): World => {
  const world: World = {
    agents: [],
    shares: null,
    usd: undefined,
    tokens: 1000,
    written: [],
    ...init,
  };
  const store = new Map<string, unknown>();
  stubState(on, store);
  on("classic.UserPromptSubmit", () => ({}));
  on("classic.PostToolBatch", () => ({}));
  on("tool.check", () => ({ decision: "allow" }));
  on("session.usage", () => ({
    value: {
      startedAt: 0,
      context: { window: 1_000_000, tokens: world.tokens },
      rateLimits: windows(world.shares),
      ...(world.usd === undefined ? {} : { cost: { usd: world.usd } }),
    },
  }));
  on("agent.list", () => ({
    value: world.agents.map((status, i) => ({
      id: `a${i}`,
      description: "",
      type: "claudetto:Hephaestus",
      status,
    })),
  }));
  on("session.cwd", () => ({ value: "/p" }));
  on("session.id", () => ({ value: "s1" }));
  on("fs.exists", () => ({ value: false }));
  on("fs.write", (_$, e) => {
    world.written.push(e.text);
    return { value: undefined };
  });
  on("session.measure", (_$, e) => ({ changed: e.changed }));
  mock.env(on, { HOME: "/u", TMPDIR: "/t" });
  return world;
};

const measure = ($: Engine, five: number, seven: number) =>
  $.session.measure({
    context: { window: 1_000_000 },
    rateLimits: windows([five, seven]),
    changed: ["rateLimits"],
  });

const prompt = ($: Engine) => $.classic.UserPromptSubmit({ prompt: "go on" });

const check = ($: Engine, tool: string, input: Record<string, string>) =>
  $.tool.check({ tool, input } as ToolCheckArgs);

const agentCall = ($: Engine) =>
  check($, "Agent", { subagent_type: "claudetto:Hephaestus", prompt: "do it" });

test("Band Change", async ($: Engine, on: On) => {
  stub(on);
  await measure($, 39, 10);
  await prompt($);
  await measure($, 41, 10);
  const lines = (await prompt($)).additionalContext ?? [];
  expect(lines.length).toBe(1);
  expect(lines[0]).toContain("amber");
  expect(lines[0]).toContain("41%");
  expect(lines[0]).toContain("10%");
  expect(lines[0]?.split("\n").length).toBe(1);
  expect((await prompt($)).additionalContext ?? []).toStrictEqual([]);
});

test("Band Change on PostToolBatch", async ($: Engine, on: On) => {
  stub(on);
  await measure($, 39, 10);
  await prompt($);
  await measure($, 81, 10);
  const batch = await $.classic.PostToolBatch({ tool_calls: [] });
  expect(batch.additionalContext?.length).toBe(1);
  expect(batch.additionalContext?.[0]).toContain("red");
  expect((await prompt($)).additionalContext ?? []).toStrictEqual([]);
});

test("Same Band", async ($: Engine, on: On) => {
  stub(on);
  await measure($, 41, 10);
  await prompt($);
  await measure($, 42, 10);
  expect((await prompt($)).additionalContext ?? []).toStrictEqual([]);
});

test("API Key", async ($: Engine, on: On) => {
  stub(on);
  await $.session.measure({
    context: { window: 1_000_000 },
    rateLimits: [],
    cost: { usd: 1 },
    changed: ["cost"],
  });
  expect((await prompt($)).additionalContext ?? []).toStrictEqual([]);
});

test("Second Agent at Red", async ($: Engine, on: On) => {
  stub(on, { agents: ["running"], shares: [85, 10] });
  const verdict = await agentCall($);
  expect(verdict.decision).toBe("ask");
  expect(verdict.reason).toContain("85%");
});

test("First Agent at Red", async ($: Engine, on: On) => {
  stub(on, { agents: ["completed"], shares: [85, 10] });
  expect((await agentCall($)).decision).toBe("allow");
});

test("Weekly Red", async ($: Engine, on: On) => {
  stub(on, { agents: ["running"], shares: [30, 95] });
  expect((await agentCall($)).decision).toBe("allow");
});

test("Paid Recipe at Red", async ($: Engine, on: On) => {
  stub(on, { shares: [90, 10] });
  for (const command of [
    "just sandbox",
    "just sandbox-alone claudetto",
    "just eval --model haiku",
    "just eval-tune --model haiku",
    "just eval-variant main --model haiku",
  ]) {
    const verdict = await check($, "Bash", { command });
    expect([command, verdict.decision]).toStrictEqual([command, "ask"]);
    expect(verdict.reason).toContain("90%");
  }
  for (const command of ["just lab", "just test tests/kernel", "ls"])
    expect([
      command,
      (await check($, "Bash", { command })).decision,
    ]).toStrictEqual([command, "allow"]);
});

test("Paid Recipe Below Red", async ($: Engine, on: On) => {
  const world = stub(on, { shares: [80, 10] });
  expect((await check($, "Bash", { command: "just sandbox" })).decision).toBe(
    "allow",
  );
  world.shares = null;
  expect((await check($, "Bash", { command: "just sandbox" })).decision).toBe(
    "allow",
  );
});

test("Handoff", async ($: Engine, on: On) => {
  const world = stub(on, { usd: 2.5, tokens: 900_000 });
  const clock = mock.clock(on, { now: 10 * 3_600_000 });
  on("session.messages", () => ({
    value: [{ role: "user", text: "Build it.", toolUses: [], handle: "h0" }],
  }));
  on("session.turns", () => ({ value: 2 }));
  on("fs.list", () => ({ value: [] }));
  on("fs.stat", () => ({
    value: { kind: "file", size: 100, mtimeMs: 0, isLink: false },
  }));
  on("ui.log", () => ({ value: undefined }));
  on("command.run", () => ({ text: "" }));
  on("prompt.submit", (_$, e) => ({ text: e.text }));
  on("classic.Stop", () => ({}));
  await measure($, 20, 5);
  world.shares = [31, 5];
  await $.classic.Stop({ stop_hook_active: false });
  await clock.settle();
  const text = world.written.find((t) => t.includes("Task:")) ?? "";
  expect(text).toContain("$2.50");
  expect(text).toContain("+11%");
  expect(text).toContain("5-hour");
  expect(text).toContain("weekly");
});
