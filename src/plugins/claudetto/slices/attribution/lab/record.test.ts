// Lab tests of the record that the `attribution` hooks write for the `commit-msg` hook of git (`kernel/commit-hook`).
// `env.get` and the `fs` calls are stubbed, and the stubs keep the files that the hooks write.
// The file is self-contained, because `just generate` copies it to `tests/` of the plugin, where it cannot import a relative file.

import type { On } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

const TRAILER = "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>";

/** The stubs of an engine with the settings `settings` and a session `session`, and the files that were written, by path. */
const engine = (
  on: On,
  session: string,
  settings: Record<string, unknown> = {},
) => {
  const files: Record<string, string> = {};
  mock.env(on, { HOME: "/home/me" });
  on("session.id", () => ({ value: session }));
  on("session.model", () => ({ value: "claude-opus-5-5" }));
  on("settings.read", () => ({ value: settings }));
  on("fs.write", (_$, e) => {
    files[e.path] = e.text;
    return { value: undefined };
  });
  on("fs.exists", () => ({ value: true }));
  on("fs.list", () => ({
    value: Object.keys(files).map((path) => ({
      name: path.split("/").pop() as string,
      kind: "file" as const,
      isLink: false,
      size: 0,
      mtimeMs: 0,
    })),
  }));
  on("prompt.submit", (_$, e) => ({ text: e.text }));
  on("agent.spawn", (_$, e) => ({
    model: e.model ?? "claude-opus-5-5",
    agentId: "a1",
  }));
  return files;
};

const submit = ($: Engine) =>
  $.prompt.submit({
    text: "Commit it.",
    wait: false,
    origin: { kind: "composer" },
  });

const spawn = ($: Engine, model?: string) =>
  $.agent.spawn({
    tool_use_id: "t1",
    prompt: "Commit the fix.",
    description: "Commit the fix.",
    subagentType: "general-purpose",
    provider: { plugin: "engine", tier: "core" },
    parentModel: "claude-opus-5-5",
    background: false,
    fork: false,
    ...(model ? { model } : {}),
  });

const DIR = "/home/me/.claudetto/attribution";

// biome-ignore lint/plugin: a test name
test("a prompt writes the commit line to the `main` file of the session", async ($: Engine, on: On) => {
  const files = engine(on, "r1");
  await submit($);
  expect(files[`${DIR}/r1/main`]).toBe(TRAILER);
});

// biome-ignore lint/plugin: a test name
test("a subagent writes the commit line of its model to its own file", async ($: Engine, on: On) => {
  const files = engine(on, "r2");
  await spawn($, "claude-haiku-5-5");
  expect(files[`${DIR}/r2/agent-claude-haiku-5-5`]).toBe(
    "Co-Authored-By: Claude Haiku 5.5 <noreply@anthropic.com>",
  );
});

// biome-ignore lint/plugin: a test name
test("with the commit line off, a prompt empties each file of the session", async ($: Engine, on: On) => {
  const files = engine(on, "r3", { attribution: { commit: "" } });
  files[`${DIR}/r3/main`] = TRAILER;
  files[`${DIR}/r3/agent-x`] = TRAILER;
  await submit($);
  expect(files[`${DIR}/r3/main`]).toBe("");
  expect(files[`${DIR}/r3/agent-x`]).toBe("");
});

test("the same line is written one time", async ($: Engine, on: On) => {
  const files = engine(on, "r4");
  await submit($);
  files[`${DIR}/r4/main`] = "changed";
  await submit($);
  expect(files[`${DIR}/r4/main`]).toBe("changed");
});
