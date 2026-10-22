// Lab tests of the `prompt.context` hook of the `prompt` slice: the `context_management` block of the compaction gate.
// The hook under test sits above the stub of the engine, so the stub answers `next(e)`.

import type { On } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

const PROFILE = { options: { compaction: "built-in" } };

const ENGINE_BLOCKS = [{ name: "currentDate", text: "2026-10-22" }];

const contextBlocks = async (
  $: Engine,
  on: On,
  env: Record<string, string>,
) => {
  on("prompt.context", () => ({ blocks: ENGINE_BLOCKS }));
  mock.env(on, env);
  return (await $.prompt.context({ blocks: ENGINE_BLOCKS })).blocks;
};

const contextText = async ($: Engine, on: On, env: Record<string, string>) =>
  (await contextBlocks($, on, env)).find((b) => b.name === "context_management")
    ?.text;

test("with the handoff on, the `context_management` block says that a handoff carries the work", async ($: Engine, on: On) => {
  expect(await contextText($, on, {})).toContain("a handoff file carries");
});

test("with `DISABLE_COMPACT`, the `context_management` block says that compaction is off", async ($: Engine, on: On) => {
  const text = await contextText($, on, { DISABLE_COMPACT: "1" });
  expect(text).toContain("Compaction is off.");
  expect(text).not.toContain("summarizes");
});

test(
  "with the compaction profile, the `context_management` block says that Claude Code summarizes the context",
  PROFILE,
  async ($: Engine, on: On) => {
    const text = await contextText($, on, {});
    expect(text).toContain("summarizes");
    expect(text).not.toContain("handoff");
  },
);

test("the other blocks of the context stay", async ($: Engine, on: On) => {
  const blocks = await contextBlocks($, on, {});
  expect(blocks.map((b) => b.name)).toEqual([
    "currentDate",
    "context_management",
  ]);
  expect(blocks[0]?.text).toBe("2026-10-22");
});

/** The blocks of the context on a host whose `uname -s` prints `platform` and whose `SHELL` is `shell`. */
const hostBlocks = async (
  $: Engine,
  on: On,
  platform: string,
  shell: string,
) => {
  on("process.run", () => ({
    value: {
      exitCode: 0,
      stdout: `${platform}\n`,
      stderr: "",
      isStdoutTruncated: false,
      isStderrTruncated: false,
    },
  }));
  return contextBlocks($, on, { SHELL: shell });
};

test("on macOS with zsh, the `shell` block names the missing `timeout` and the zsh glob error", async ($: Engine, on: On) => {
  const text = (await hostBlocks($, on, "Darwin", "/bin/zsh")).find(
    (b) => b.name === "shell",
  )?.text;
  expect(text).toContain("`timeout`");
  expect(text).toContain("no matches found");
});

test("on Linux with bash, the context has no `shell` block", async ($: Engine, on: On) => {
  const blocks = await hostBlocks($, on, "Linux", "/bin/bash");
  expect(blocks.map((b) => b.name)).toEqual([
    "currentDate",
    "context_management",
  ]);
});
