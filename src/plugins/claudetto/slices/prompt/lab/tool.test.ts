// Lab tests of the `tool.describe` hook of the `prompt` slice: the `Agent` description and the deferral of `ListAgents`.
// The stub of the engine answers as the engine does, so the handler gets the built-in answer from `next`.

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

const BUILT_IN = "x".repeat(4000);

const describe = ($: Engine, on: On, tool: string, description = BUILT_IN) => {
  on("tool.describe", () => ({ description: BUILT_IN }));
  return $.tool.describe({
    tool,
    description,
    provider: { plugin: "engine", tier: "core" },
  });
};

test("`tool.describe` replaces the built-in `Agent` description with a shorter one", async ($: Engine, on: On) => {
  const answer = await describe($, on, "Agent");
  expect(answer.description.length).toBeLessThan(BUILT_IN.length);
  expect(answer.isDeferred).toBeUndefined();
});

test("`tool.describe` keeps a built-in `Agent` description that is shorter", async ($: Engine, on: On) => {
  on("tool.describe", () => ({ description: "short" }));
  const answer = await $.tool.describe({
    tool: "Agent",
    description: "short",
    provider: { plugin: "engine", tier: "core" },
  });
  expect(answer.description).toBe("short");
});

test("`tool.describe` defers `ListAgents` and keeps its built-in description", async ($: Engine, on: On) => {
  const answer = await describe($, on, "ListAgents");
  expect(answer.isDeferred).toBe(true);
  expect(answer.description).toBe(BUILT_IN);
});

test("`tool.describe` passes an unknown tool on with no change", async ($: Engine, on: On) => {
  const answer = await describe($, on, "Grep", "x");
  expect(answer).toStrictEqual({ description: BUILT_IN });
});
