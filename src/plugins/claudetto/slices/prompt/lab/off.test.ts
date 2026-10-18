// Lab tests of the `off` hooks of the `prompt` slice: `prompt.attachment`, `command.describe`, and `agent.offer`.
// The hook under test sits above the stub of the engine, so the stub answers `next(e)`.

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

const ENGINE = { plugin: "engine", tier: "core" } as const;

const attach = ($: Engine, on: On, type: string) => {
  on("prompt.attachment", () => ({ text: "engine text" }));
  return $.prompt.attachment({
    type,
    text: "engine text",
    origin: { kind: "engine" },
  });
};

const describe = ($: Engine, on: On, command: string) => {
  on("command.describe", (_$, e) => ({
    description: e.description,
    isHidden: e.isHidden,
  }));
  return $.command.describe({
    command,
    description: "A command.",
    isHidden: false,
    immediate: false,
    provider: ENGINE,
  });
};

const offer = ($: Engine, on: On, agent: string) => {
  on("agent.offer", () => ({ isOffered: true }));
  return $.agent.offer({
    agent,
    description: "An agent.",
    source: "built-in",
    provider: ENGINE,
  });
};

// biome-ignore lint/plugin: a test name that a `slice.ts` file references
test("`prompt.attachment` leaves out an attachment of an `off` kind", async ($: Engine, on: On) => {
  expect((await attach($, on, "task_reminder")).text).toBeNull();
});

test("`prompt.attachment` keeps an attachment of another kind", async ($: Engine, on: On) => {
  expect((await attach($, on, "auto_mode")).text).toBe("engine text");
});

test("`command.describe` hides a command of an `off` name", async ($: Engine, on: On) => {
  expect((await describe($, on, "voice")).isHidden).toBe(true);
});

test("`command.describe` keeps another command in the menu", async ($: Engine, on: On) => {
  expect((await describe($, on, "help")).isHidden).toBe(false);
});

// biome-ignore lint/plugin: a test name that a `slice.ts` file references
test("`agent.offer` takes an agent type of an `off` name from the model", async ($: Engine, on: On) => {
  expect((await offer($, on, "comment-thread-analyst")).isOffered).toBe(false);
});

test("`agent.offer` keeps another agent type", async ($: Engine, on: On) => {
  expect((await offer($, on, "Explore")).isOffered).toBe(true);
});
