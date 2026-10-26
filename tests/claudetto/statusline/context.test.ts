// The context segment: the percent against the window that Claude Code gives, and the distance to the handoff.

import { expect, test } from "bun:test";
import type { Deps } from "../../../plugins/claudetto/modules/statusline/adapters/cli.ts";
import { rowsOf } from "./support.ts";

const withContext = (
  model: string,
  context: Record<string, unknown>,
  env: Record<string, string> = {},
  over: Partial<Deps> = {},
) =>
  rowsOf(
    { model: { id: model }, context_window: context },
    { env: { COLUMNS: "160", NO_COLOR: "1", ...env }, ...over },
  );

test("an Opus session with a 1M window shows the `used_percentage` and the window that Claude Code reports", async () => {
  const { text } = await withContext("claude-opus-5-5", {
    total_input_tokens: 120_000,
    context_window_size: 1_000_000,
    used_percentage: 12,
  });
  expect(text).toContain("▤ ctx 12% of 1M ⇥47%");
});

test("an Opus session counts the distance from the handoff trigger of 225k tokens", async () => {
  const { text } = await withContext("claude-opus-5-5", {
    total_input_tokens: 45_000,
    context_window_size: 300_000,
    used_percentage: 15,
  });
  expect(text).toContain("▤ ctx 15% of 300k ⇥80%");
});

test("a Haiku session counts the distance from the Haiku trigger of 90k tokens", async () => {
  const { text } = await withContext("claude-haiku-4-5", {
    total_input_tokens: 40_000,
    context_window_size: 200_000,
    used_percentage: 20,
  });
  expect(text).toContain("▤ ctx 20% of 200k ⇥56%");
});

test("the compaction profile shows the distance to the compaction threshold with its own icon", async () => {
  const { text } = await withContext(
    "claude-opus-5-5",
    {
      total_input_tokens: 45_000,
      context_window_size: 300_000,
      used_percentage: 15,
    },
    { CLAUDE_PLUGIN_OPTION_COMPACTION: "built-in" },
  );
  expect(text).toContain("▤ ctx 15% of 300k ⇲80%");
});

test("a context past the trigger shows `now`", async () => {
  const { text } = await withContext("claude-opus-5-5", {
    total_input_tokens: 230_000,
    context_window_size: 300_000,
    used_percentage: 77,
  });
  expect(text).toContain("⇥now");
});

test("before the first message the context has no percent, so the segment is out", async () => {
  const { text } = await withContext("claude-opus-5-5", {
    total_input_tokens: 0,
    context_window_size: 1_000_000,
    used_percentage: null,
  });
  expect(text).not.toContain("▤");
});

test("a percent that is not a number shows the error mark", async () => {
  const { text } = await withContext("claude-opus-5-5", {
    used_percentage: "many",
  });
  expect(text).toContain("▤ ✗");
});

const ESC = String.fromCharCode(27);
const GREEN = `${ESC}[38;2;78;186;101m`;
const YELLOW = `${ESC}[38;2;255;193;7m`;
const RED = `${ESC}[38;2;255;107;128m`;

const colored = async (model: string, tokens: number): Promise<string> => {
  const { text } = await rowsOf(
    {
      model: { id: model },
      context_window: {
        total_input_tokens: tokens,
        context_window_size: 1_000_000,
        used_percentage: tokens / 10_000,
      },
    },
    { env: { COLUMNS: "160" } },
  );
  return text;
};

test("the context is normal far from the trigger, warning within 10% of it, and limit from it", async () => {
  expect(await colored("claude-opus-5-5", 100_000)).toContain(`${GREEN}⇥`);
  expect(await colored("claude-opus-5-5", 203_000)).toContain(`${YELLOW}⇥`);
  expect(await colored("claude-opus-5-5", 225_000)).toContain(`${RED}⇥`);
  expect(await colored("claude-haiku-4-5", 82_000)).toContain(`${YELLOW}⇥`);
  expect(await colored("claude-haiku-4-5", 50_000)).toContain(`${GREEN}⇥`);
});

test("Claude Code gives no plugin option to a `statusLine` command, so the profile reads `pluginConfigs` of the user settings", async () => {
  const settings = {
    pluginConfigs: {
      "claudetto@claudetto": { options: { compaction: "built-in" } },
    },
  };
  const { text } = await withContext(
    "claude-opus-5-5",
    {
      total_input_tokens: 45_000,
      context_window_size: 300_000,
      used_percentage: 15,
    },
    {},
    {
      files: {
        read: async (file: string) =>
          file === "/home/user/.claude/settings.json"
            ? JSON.stringify(settings)
            : null,
        list: async () => [],
      },
    },
  );
  expect(text).toContain("▤ ctx 15% of 300k ⇲80%");
});

test("a settings file that is not JSON leaves the handoff icon and logs the cause", async () => {
  const { text, run } = await withContext(
    "claude-opus-5-5",
    {
      total_input_tokens: 45_000,
      context_window_size: 300_000,
      used_percentage: 15,
    },
    {},
    {
      files: {
        read: async (file: string) =>
          file === "/home/user/.claude/settings.json" ? "{" : null,
        list: async () => [],
      },
    },
  );
  expect(text).toContain("▤ ctx 15% of 300k ⇥80%");
  expect(run.err.length).toBeGreaterThan(0);
});

const SETTINGS_BUILT_IN = JSON.stringify({
  pluginConfigs: {
    "claudetto@claudetto": { options: { compaction: "built-in" } },
  },
});

const OPUS_CONTEXT = {
  total_input_tokens: 45_000,
  context_window_size: 300_000,
  used_percentage: 15,
};

const settingsAt = (file: string, text: string) => ({
  read: async (path: string) => (path === file ? text : null),
  list: async () => [],
});

test("the env var `CLAUDE_PLUGIN_OPTION_COMPACTION` set to another value wins over `built-in` in `pluginConfigs`", async () => {
  const { text } = await withContext(
    "claude-opus-5-5",
    OPUS_CONTEXT,
    { CLAUDE_PLUGIN_OPTION_COMPACTION: "other" },
    {
      files: settingsAt("/home/user/.claude/settings.json", SETTINGS_BUILT_IN),
    },
  );
  expect(text).toContain("⇥80%");
  expect(text).not.toContain("⇲");
});

test("the env var `CLAUDE_PLUGIN_OPTION_COMPACTION` set to `built-in` wins over a `pluginConfigs` with another value", async () => {
  const settings = JSON.stringify({
    pluginConfigs: {
      "claudetto@claudetto": { options: { compaction: "other" } },
    },
  });
  const { text } = await withContext(
    "claude-opus-5-5",
    OPUS_CONTEXT,
    { CLAUDE_PLUGIN_OPTION_COMPACTION: "built-in" },
    { files: settingsAt("/home/user/.claude/settings.json", settings) },
  );
  expect(text).toContain("⇲80%");
});

test("the `settings.json` of `CLAUDE_CONFIG_DIR` is the one that sets the profile", async () => {
  const { text } = await withContext(
    "claude-opus-5-5",
    OPUS_CONTEXT,
    { CLAUDE_CONFIG_DIR: "/cfg" },
    { files: settingsAt("/cfg/settings.json", SETTINGS_BUILT_IN) },
  );
  expect(text).toContain("⇲80%");
});

test("a `settings.json` that is not JSON still prints the line and exits 0", async () => {
  const { text, run } = await withContext(
    "claude-opus-5-5",
    OPUS_CONTEXT,
    { CLAUDE_CONFIG_DIR: "/cfg" },
    { files: settingsAt("/cfg/settings.json", "{") },
  );
  expect(run.status).toBe(0);
  expect(run.err.length).toBeGreaterThan(0);
  expect(text).toContain("▤ ctx 15% of 300k");
});
