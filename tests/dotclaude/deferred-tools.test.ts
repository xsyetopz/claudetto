// Test 9.5: the core plugin never turns off the deferral of tools, and the ban list of the env names that do is exact.
// The engine defers the tools that it can only when none of these keys sends every tool schema in full.

import { expect, test } from "bun:test";
import path from "node:path";
import { type Env, PLUGINS } from "../support/repo.ts";

// The env names that turn off deferral or send every tool in full, and the one value that turns off a name that has values.
const ENV_BANNED = [
  { name: "CLAUDE_CODE_SIMPLE", value: null },
  { name: "CLAUDE_CODE_DISABLE_ATTACHMENTS", value: null },
  { name: "ENABLE_TOOL_SEARCH", value: "false" },
  { name: "ENABLE_TOOL_SEARCH", value: "0" },
  { name: "ENABLE_TOOL_SEARCH", value: "auto:0" },
];

/** The bans that `env` breaks. */
const broken = (env: Env) =>
  ENV_BANNED.filter(
    ({ name, value }) =>
      name in env && (value === null || String(env[name]) === value),
  );

test("a ban matches its value and no other", () => {
  expect(broken({ ENABLE_TOOL_SEARCH: "true" })).toStrictEqual([]);
  expect(broken({ ENABLE_TOOL_SEARCH: "auto:0" })).toStrictEqual([
    { name: "ENABLE_TOOL_SEARCH", value: "auto:0" },
  ]);
  expect(broken({ CLAUDE_CODE_SIMPLE: "1" }).length).toBe(1);
});

test("the `settings.json` of the core plugin sets no banned env name", async () => {
  const file = path.join(PLUGINS, "dotclaude/settings.json");
  const settings = JSON.parse(await Bun.file(file).text());
  expect(broken(settings.env ?? {})).toStrictEqual([]);
});
