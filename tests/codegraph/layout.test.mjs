// The shape of dotclaude-codegraph: manifest, marketplace entry, hooks, the check, and the rule that
// the add-on works alone (design D24, D26).

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { REPO } from "../support/repo.mjs";
import { PLUGIN, runHook, setUp } from "./fake-cli.mjs";

const json = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const manifest = json(path.join(PLUGIN, ".claude-plugin/plugin.json"));
const hooks = json(path.join(PLUGIN, "hooks/hooks.json"));
const ORDER = [
  "dotclaude",
  "dotclaude-codegraph",
  "dotclaude-jev",
  "dotclaude-browser",
  "dotclaude-docs",
  "dotclaude-sessions",
  "dotclaude-lab",
];

test("the marketplace lists the plugins in order, and the entry has the manifest description", () => {
  const { plugins } = json(path.join(REPO, ".claude-plugin/marketplace.json"));
  assert.deepEqual(
    plugins.map((p) => p.name),
    ORDER,
  );
  const entry = plugins[1];
  assert.equal(entry.source, "./plugins/dotclaude-codegraph");
  assert.equal(entry.description, manifest.description);
});

test("the plugin has classic command hooks, no module, and no MCP server", () => {
  assert.equal(hooks.modules, undefined);
  assert.equal(fs.existsSync(path.join(PLUGIN, ".mcp.json")), false);
  assert.equal(manifest.mcpServers, undefined);
  for (const group of Object.values(hooks.hooks).flat())
    for (const hook of group.hooks) {
      assert.equal(hook.type, "command");
      const file = hook.command.match(/\$\{CLAUDE_PLUGIN_ROOT\}\/(\S+?)"/)[1];
      assert.equal(fs.existsSync(path.join(PLUGIN, file)), true, file);
    }
});

test("the plugin works alone: a copy of the plugin folder runs its hook with no other plugin", () => {
  const t = setUp();
  const copy = path.join(t.dir, "alone", "dotclaude-codegraph");
  fs.cpSync(PLUGIN, copy, { recursive: true });
  const r = runHook(
    "session-start",
    { cwd: t.project },
    t.env,
    path.join(copy, "features/graph/cli.mjs"),
  );
  assert.notEqual(r.out.hookSpecificOutput.additionalContext, undefined);
});

const check = (env, cwd) =>
  spawnSync(
    process.execPath,
    [path.join(PLUGIN, "bin/dotclaude-codegraph-check")],
    {
      cwd,
      env,
      encoding: "utf8",
    },
  );

test("the check changes nothing when PATH has no codegraph", () => {
  const t = setUp({ installed: false });
  const r = check(t.env, t.project);
  assert.equal(r.status, 0);
  assert.deepEqual(fs.readdirSync(t.project), [".codegraph"]);
  assert.deepEqual(t.log(), []);
});

test("the check runs only `--version` with an index, and exits 0 with none", () => {
  const none = setUp({ index: false });
  assert.equal(check(none.env, none.project).status, 0);
  const some = setUp();
  assert.equal(check(some.env, some.project).status, 0);
  assert.deepEqual(some.log(), ["--version"]);
});

test("no hook run calls codegraph `install` or `init`, with an index or without one", () => {
  const payloads = {
    "session-start": (project) => ({ cwd: project }),
    search: (project) => ({
      cwd: project,
      tool_name: "Grep",
      tool_input: { pattern: "parse_amount" },
    }),
    sync: (project) => ({ cwd: project, tool_name: "Edit" }),
  };
  for (const index of [true, false]) {
    const t = setUp({ index });
    for (const [mode, payload] of Object.entries(payloads))
      runHook(mode, payload(t.project), t.env);
    const subcommands = t.log().map((line) => line.split(" ")[0]);
    if (index) assert.ok(subcommands.length > 0, "the hooks called the CLI");
    assert.deepEqual(
      subcommands.filter((c) => c === "install" || c === "init"),
      [],
      `index ${index}: ${subcommands}`,
    );
  }
});
