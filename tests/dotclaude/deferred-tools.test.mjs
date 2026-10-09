// Test 9.5: the profile keeps deferred tool loading on, and no plugin file sets `isDeferred: false`.
// The engine defers the tools that it can only when none of these keys sends every tool schema in full.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "../..");
const PROFILE = JSON.parse(
  fs.readFileSync(
    path.join(ROOT, "plugins/dotclaude/features/setup/profile.json"),
    "utf8",
  ),
);

// The env names that turn off deferral or send every tool in full, and the one value that turns off a name that has values.
const ENV_BANNED = [
  { name: "CLAUDE_CODE_SIMPLE", value: null },
  { name: "CLAUDE_CODE_DISABLE_ATTACHMENTS", value: null },
  { name: "ENABLE_TOOL_SEARCH", value: "false" },
  { name: "ENABLE_TOOL_SEARCH", value: "0" },
  { name: "ENABLE_TOOL_SEARCH", value: "auto:0" },
];

test("no `env` key of the profile turns off deferred tools", () => {
  const env = PROFILE.env ?? {};
  const found = ENV_BANNED.filter(
    ({ name, value }) =>
      Object.hasOwn(env, name) &&
      (value === null || String(env[name]) === value),
  ).map(({ name }) => name);
  expect(found).toEqual([]);
});

test("a ban matches its value and no other", () => {
  const env = { ENABLE_TOOL_SEARCH: "true" };
  const hit = ENV_BANNED.filter(
    ({ name, value }) => name in env && String(env[name]) === value,
  );
  expect(hit).toEqual([]);
  expect(
    ENV_BANNED.filter(
      ({ name, value }) => name === "ENABLE_TOOL_SEARCH" && value === "false",
    ),
  ).toHaveLength(1);
});

test("the profile sets the simple system prompt, which is not the simple mode", () => {
  expect(PROFILE.env.CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT).toBe("1");
  expect(PROFILE.env.CLAUDE_CODE_SIMPLE).toBeUndefined();
});

function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return d.name === "node_modules" ? [] : files(p);
    return /\.(mjs|ts|json)$/.test(d.name) && !d.name.includes(".test.")
      ? [p]
      : [];
  });
}

test("no runtime file of the core plugin (hooks, features, lib) sets `isDeferred` to `false`", () => {
  const dirs = ["hooks", "features", "lib"];
  const bad = dirs
    .flatMap((d) => files(path.join(ROOT, "plugins/dotclaude", d)))
    .filter((f) => /isDeferred\s*:\s*false/.test(fs.readFileSync(f, "utf8")));
  expect(bad.map((f) => path.relative(ROOT, f))).toEqual([]);
});
