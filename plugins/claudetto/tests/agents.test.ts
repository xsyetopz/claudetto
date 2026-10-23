// Lab tests of the `agents` slice: the `agent.offer` hook and the `tool.call` hook of `Agent`.

import type { AgentOfferInput, On, ToolCallArgs } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

const offer = ($: Engine, agent: string, plugin: string) =>
  $.agent.offer({
    agent,
    description: "x",
    source: plugin === "engine" ? "built-in" : "plugin",
    provider: { plugin, tier: plugin === "engine" ? "core" : "plugin" },
  } as AgentOfferInput);

test("`agent.offer` hides each built-in agent", async ($: Engine) => {
  for (const agent of [
    "general-purpose",
    "Explore",
    "Plan",
    "claude",
    "claude-code-guide",
    "statusline-setup",
  ])
    expect(await offer($, agent, "engine")).toStrictEqual({ isOffered: false });
});

test("`agent.offer` hides `claudetto:main`, the agent of the main thread", async ($: Engine) => {
  expect(await offer($, "claudetto:main", "claudetto")).toStrictEqual({
    isOffered: false,
  });
});

test("`agent.offer` offers a plugin agent", async ($: Engine, on: On) => {
  on("agent.offer", () => ({ isOffered: true }));
  expect(await offer($, "claudetto:Scout", "claudetto")).toStrictEqual({
    isOffered: true,
  });
});

const called = async ($: Engine, on: On, input: Record<string, string>) => {
  let type: unknown;
  on("tool.call", { tool: ["Agent"] }, (_$, e) => {
    type = "subagent_type" in e ? e.subagent_type : undefined;
    return { result: "ok" };
  });
  await $.tool.call({
    tool: "Agent",
    description: "Read",
    prompt: "Read a.txt.",
    ...input,
  } as ToolCallArgs);
  return type;
};

test("`tool.call` gives an `Agent` call with no type the type `claudetto:Worker`", async ($: Engine, on: On) => {
  expect(await called($, on, {})).toBe("claudetto:Worker");
});

test("`tool.call` keeps the type that an `Agent` call names", async ($: Engine, on: On) => {
  expect(await called($, on, { subagent_type: "claudetto:Scout" })).toBe(
    "claudetto:Scout",
  );
});
