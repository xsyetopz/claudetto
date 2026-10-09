// The shape of dotclaude-codegraph: manifest, marketplace entry, hooks, the check, and the rule that
// the add-on works alone (design D24, D26).

import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { CLI, PLUGIN, runHook, setUp } from "./fake-cli.mjs";

const ROOT = path.join(import.meta.dirname, "../..");
const json = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const manifest = json(path.join(PLUGIN, ".claude-plugin/plugin.json"));
const hooks = json(path.join(PLUGIN, "hooks/hooks.json"));
const ORDER = [
  "dotclaude",
  "dotclaude-codegraph",
  "dotclaude-jev",
  "dotclaude-browser",
  "dotclaude-docs",
];

test("the marketplace lists the plugins in order, and the entry has the manifest description", () => {
  const { plugins } = json(path.join(ROOT, ".claude-plugin/marketplace.json"));
  expect(plugins.map((p) => p.name)).toEqual(ORDER);
  const entry = plugins[1];
  expect(entry.source).toBe("./plugins/dotclaude-codegraph");
  expect(entry.description).toBe(manifest.description);
});

test("the plugin has classic command hooks, no module, and no MCP server", () => {
  expect(hooks.modules).toBeUndefined();
  expect(fs.existsSync(path.join(PLUGIN, ".mcp.json"))).toBe(false);
  expect(manifest.mcpServers).toBeUndefined();
  expect(Object.keys(hooks.hooks)).toEqual([
    "SessionStart",
    "PreToolUse",
    "PostToolUse",
  ]);
  expect(hooks.hooks.PreToolUse[0].matcher).toBe("Grep|Glob");
  for (const group of Object.values(hooks.hooks).flat())
    for (const hook of group.hooks) {
      expect(hook.type).toBe("command");
      const file = hook.command.match(/\$\{CLAUDE_PLUGIN_ROOT\}\/(\S+?)"/)[1];
      expect(fs.existsSync(path.join(PLUGIN, file)), file).toBe(true);
    }
});

test("the sync after an edit, a write, and a git command that changes the tree is async", () => {
  const post = hooks.hooks.PostToolUse;
  expect(post[0].matcher).toBe("Edit|Write|MultiEdit|NotebookEdit");
  const all = post.flatMap((g) => g.hooks);
  for (const hook of all) expect(hook.async).toBe(true);
  const guards = post[1].hooks.map((h) => h.if);
  for (const sub of ["commit", "merge", "rebase", "pull", "checkout", "reset"])
    expect(guards).toContain(`Bash(git ${sub} *)`);
  expect(post[1].matcher).toBe("Bash");
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
  expect(r.out.hookSpecificOutput.additionalContext).toBeDefined();
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
  expect(r.status).toBe(0);
  expect(fs.readdirSync(t.project)).toEqual([".codegraph"]);
  expect(t.log()).toEqual([]);
});

test("the check runs only `--version` with an index, and exits 0 with none", () => {
  const none = setUp({ index: false });
  expect(check(none.env, none.project).status).toBe(0);
  const some = setUp();
  expect(check(some.env, some.project).status).toBe(0);
  expect(some.log()).toEqual(["--version"]);
});

test("the plugin never runs codegraph install or init", () => {
  const code = [
    "features/graph/cli.mjs",
    "features/graph/rules.mjs",
    "bin/dotclaude-codegraph-check",
  ].map((f) => fs.readFileSync(path.join(PLUGIN, f), "utf8"));
  for (const text of code) expect(text).not.toMatch(/\["(install|init)"/);
  expect(CLI).toContain("dotclaude-codegraph");
});
