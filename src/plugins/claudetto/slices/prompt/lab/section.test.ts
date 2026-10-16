// Lab tests of the `prompt.section` hook of the `prompt` slice: the transform of each built-in section,
// and the compaction gate of the `context_management` section in `prompt.section` and `prompt.compose`.
// The hook under test sits above the stub of the engine, so the stub answers `next(e)`.

import type { On } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

const SUMMARY =
  // biome-ignore lint/plugin: text of the engine that the test feeds to the transform
  "When the conversation grows long, some or all of the current context is summarized; the summary is provided in the next context window.";

const PROFILE = { options: { compaction: "built-in" } };

// The `system` line of the engine about the compression of earlier messages, and the text of each state.
const COMPRESS =
  // biome-ignore lint/plugin: text of the engine that the test feeds to the transform
  " - The system will automatically compress prior messages in your conversation as it approaches context limits. This means your conversation with the user is not limited by the context window.";
const HANDOFF_LINE =
  // biome-ignore lint/plugin: text of the system section that the test expects
  " - A handoff file carries the work into the next context window, so the conversation is not limited by the context window.";
const OFF_LINE = " - Compaction is off. Work continues in this context window.";
const HANDOFF_TEXT =
  // biome-ignore lint/plugin: text of the section that the test expects
  "When the conversation grows long, a handoff file carries the work into the next context window, so you do not need to wrap up early or stop mid-task.";

// biome-ignore lint/plugin: a test name that a `slice.ts` file references
test("with the handoff on, the `context_management` section says that a handoff carries the work", async ($: Engine, on: On) => {
  on("prompt.section", () => ({ text: "engine text" }));
  mock.env(on, {});
  const out = await $.prompt.section({
    name: "context_management",
    text: SUMMARY,
  });
  expect(out.text).toBe(HANDOFF_TEXT);
});

// biome-ignore lint/plugin: a test name that a `slice.ts` file references
test("with `DISABLE_COMPACT`, the `context_management` section says that compaction is off", async ($: Engine, on: On) => {
  on("prompt.section", () => ({ text: "engine text" }));
  mock.env(on, { DISABLE_COMPACT: "1" });
  const out = await $.prompt.section({
    name: "context_management",
    text: SUMMARY,
  });
  expect(out.text).toContain("Compaction is off.");
  expect(out.text).not.toContain("is summarized");
});

test(
  // biome-ignore lint/plugin: a test name that a `slice.ts` file references
  "with the compaction profile, the `context_management` section keeps the engine text",
  PROFILE,
  async ($: Engine, on: On) => {
    on("prompt.section", () => ({ text: "engine text" }));
    mock.env(on, {});
    const out = await $.prompt.section({
      name: "context_management",
      text: SUMMARY,
    });
    expect(out.text).toBe("engine text");
  },
);

/** The system prompt of a session on Opus 5.5, with the built-in `context_management` section. */
const composed = async ($: Engine, on: On) => {
  on("session.id", () => ({ value: "s1" }));
  mock.env(on, {});
  on("prompt.compose", () => ({
    sections: [
      { id: "intro", text: "engine intro", scope: "shared" },
      { id: "context_management", text: SUMMARY, scope: "session" },
    ],
  }));
  const out = await $.prompt.compose({
    model: "claude-opus-5-5",
    promptModel: "claude-opus-5-5",
    surfaces: ["terminal"],
    tools: [],
    outputStyle: null,
    traits: [],
  });
  return out.sections.map((s) => s.text).join("\n\n");
};

// biome-ignore lint/plugin: a test name that a `slice.ts` file references
test("with the handoff on, the system prompt has no compaction text", async ($: Engine, on: On) => {
  const text = await composed($, on);
  expect(text).toContain(HANDOFF_TEXT);
  expect(text).not.toContain(SUMMARY);
});

test(
  // biome-ignore lint/plugin: a test name that a `slice.ts` file references
  "with the compaction profile, the system prompt has no handoff text",
  PROFILE,
  async ($: Engine, on: On) => {
    const text = await composed($, on);
    expect(text).not.toContain(HANDOFF_TEXT);
    expect(text).toContain(SUMMARY);
  },
);

test("a section with a transform gets its shorter text", async ($: Engine, on: On) => {
  on("prompt.section", () => ({ text: "engine text" }));
  const text =
    // biome-ignore lint/plugin: text of the engine that the test feeds to the transform
    "You have a persistent file-based memory at `/x/`. This directory already exists — write to it directly with the Write tool (do not run mkdir or check for its existence).";
  const out = await $.prompt.section({ name: "memory", text });
  expect(out.text).not.toBe("engine text");
  expect(out.text?.length).toBeLessThan(text.length);
});

test("another section keeps the text of the engine", async ($: Engine, on: On) => {
  on("prompt.section", () => ({ text: "engine text" }));
  const out = await $.prompt.section({
    name: "unknown_section",
    text: "built-in text",
  });
  expect(out.text).toBe("engine text");
});

test("a section with null text keeps the engine text", async ($: Engine, on: On) => {
  on("prompt.section", () => ({ text: "engine text" }));
  const out = await $.prompt.section({ name: "memory", text: null });
  expect(out.text).toBe("engine text");
});

/** The debug log lines of the hook. */
const debugLogs = (on: On) => {
  const logs: string[] = [];
  on("ui.log", (_$, e) => {
    if (e.to === "debug") logs.push(e.text);
    return { value: undefined };
  });
  return logs;
};

// biome-ignore lint/plugin: a test name that a `slice.ts` file references
test("when an anchor of a transform finds nothing, a debug log line names the anchor and the section", async ($: Engine, on: On) => {
  on("prompt.section", () => ({ text: "engine text" }));
  const logs = debugLogs(on);
  const text = " - Platform: darwin\n - Shell: zsh";
  const out = await $.prompt.section({ name: "env_info_simple", text });
  expect(out.text).toBe(text);
  expect(logs.length).toBeGreaterThan(0);
  expect(logs.every((l) => l.includes("`env_info_simple`"))).toBe(true);
  expect(logs.some((l) => l.includes("Fast mode for Claude Code"))).toBe(true);
});

// biome-ignore lint/plugin: a test name that a `slice.ts` file references
test("when each anchor of a transform finds its part, no debug log line is written", async ($: Engine, on: On) => {
  on("prompt.section", () => ({ text: "engine text" }));
  const logs = debugLogs(on);
  const text = [
    " - The most recent Claude models are the Claude 5 family.",
    " - Claude Code is available as a CLI in the terminal.",
    // biome-ignore lint/plugin: text of the engine that the test feeds to the transform
    " - Fast mode for Claude Code uses Claude Opus with faster output.",
  ].join("\n");
  await $.prompt.section({ name: "env_info_simple", text });
  expect(logs).toEqual([]);
});

/** The `system` section of a model with no variant, through `prompt.compose`, and the debug logs. */
const composedSystem = async ($: Engine, on: On) => {
  on("session.id", () => ({ value: "s2" }));
  on("prompt.compose", () => ({
    sections: [{ id: "system", text: COMPRESS, scope: "shared" }],
  }));
  const logs = debugLogs(on);
  const out = await $.prompt.compose({
    model: "other-model",
    promptModel: "other-model",
    surfaces: ["terminal"],
    tools: [],
    outputStyle: null,
    traits: [],
  });
  return { text: out.sections.map((s) => s.text).join(""), logs };
};

// biome-ignore lint/plugin: a test name that a `slice.ts` file references
test("with the handoff on, the `system` section says that a handoff file carries the work", async ($: Engine, on: On) => {
  on("prompt.section", () => ({ text: "engine text" }));
  mock.env(on, {});
  const out = await $.prompt.section({ name: "system", text: COMPRESS });
  expect(out.text).toBe(HANDOFF_LINE);
});

// biome-ignore lint/plugin: a test name that a `slice.ts` file references
test("with `DISABLE_COMPACT`, the `system` section says that compaction is off", async ($: Engine, on: On) => {
  on("prompt.section", () => ({ text: "engine text" }));
  mock.env(on, { DISABLE_COMPACT: "1" });
  const out = await $.prompt.section({ name: "system", text: COMPRESS });
  expect(out.text).toBe(OFF_LINE);
});

test(
  // biome-ignore lint/plugin: a test name that a `slice.ts` file references
  "with the compaction profile, the `system` section keeps a shorter compression line",
  PROFILE,
  async ($: Engine, on: On) => {
    on("prompt.section", () => ({ text: "engine text" }));
    mock.env(on, {});
    const out = await $.prompt.section({ name: "system", text: COMPRESS });
    expect(out.text).not.toBe(HANDOFF_LINE);
    expect(out.text).not.toBe(OFF_LINE);
    expect(out.text).not.toBe(COMPRESS);
  },
);

// biome-ignore lint/plugin: a test name that a `slice.ts` file references
test("with the handoff on, `prompt.compose` gives the `system` section of a model with no variant the handoff line", async ($: Engine, on: On) => {
  mock.env(on, {});
  const { text } = await composedSystem($, on);
  expect(text).toBe(HANDOFF_LINE);
});

// biome-ignore lint/plugin: a test name that a `slice.ts` file references
test("`prompt.compose` writes no debug log for a section that an anchor does not find", async ($: Engine, on: On) => {
  mock.env(on, {});
  const { logs } = await composedSystem($, on);
  expect(logs).toEqual([]);
});
