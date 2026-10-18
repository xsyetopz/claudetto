// The skill `codegraph` and the layout of the add-on after D51.
// `codegraph install` sets up the MCP server and the sync, so the add-on has no hook and no MCP text.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { REPO } from "../support/repo.ts";

const PLUGIN = path.join(REPO, "plugins/claudetto-codegraph");
const skillText = () =>
  Bun.file(path.join(PLUGIN, "skills/codegraph/SKILL.md")).text();

test("the skill does not say that the plugin starts no MCP server, and it never tells the user to run `claude mcp add`", async () => {
  const skill = await skillText();
  expect(skill).not.toContain("starts no MCP server");
  expect(skill).not.toContain("claude mcp add");
  expect(skill).not.toContain("claudetto-codegraph-check --mcp");
  expect(skill).not.toContain("hooks of this plugin sync");
});

test("no setup text or skill text tells the agent to skip `codegraph install`", async () => {
  const skill = await skillText();
  expect(skill).not.toMatch(/do not (run|use) `?codegraph install/i);
  expect(skill).toContain(
    "codegraph install --target claude --location global",
  );
});

test("the add-on registers no hook and has no sync code, because `codegraph` syncs its own index", () => {
  const file = path.join(PLUGIN, "hooks/hooks.json");
  const hooks = fs.existsSync(file)
    ? (JSON.parse(fs.readFileSync(file, "utf8")).hooks ?? {})
    : {};
  expect(Object.keys(hooks)).toStrictEqual([]);
  for (const gone of [
    "adapters/hook.ts",
    "adapters/lock.ts",
    "adapters/mod.ts",
  ])
    expect(fs.existsSync(path.join(PLUGIN, "slices/graph", gone))).toBe(false);
});
