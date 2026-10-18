// The shape of claudetto-codegraph: manifest, marketplace entry, hooks, the check, and the rule that
// the add-on works alone (design D24, D26).

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
  INSTALL_COMMAND,
  MCP_ADD_COMMAND,
  MCP_REMOVE_COMMAND,
} from "../../plugins/claudetto-codegraph/slices/graph/graph.ts";
import { slice } from "../../plugins/claudetto-codegraph/slices/graph/slice.ts";
import { type Env, REPO } from "../support/repo.ts";
import { PLUGIN, run, runHook, setUp } from "./fake-cli.ts";

const json = (file: string) => Bun.file(file).json();
const manifest: { description: string; mcpServers?: unknown } = await json(
  path.join(PLUGIN, ".claude-plugin/plugin.json"),
);
const hooks: {
  modules?: unknown;
  hooks: Record<string, { hooks: { type: string; command: string }[] }[]>;
} = await json(path.join(PLUGIN, "hooks/hooks.json"));
const ORDER = [
  "claudetto",
  "claudetto-codegraph",
  "claudetto-browser",
  "claudetto-docs",
  "claudetto-sessions",
  "claudetto-lab",
];

test("the marketplace lists the plugins in order, and the entry has the manifest description", async () => {
  const {
    plugins,
  }: { plugins: { name: string; source: string; description: string }[] } =
    await json(path.join(REPO, ".claude-plugin/marketplace.json"));
  expect(plugins.map((p) => p.name)).toStrictEqual(ORDER);
  const entry = plugins[1] as (typeof plugins)[number];
  expect(entry.source).toBe("./plugins/claudetto-codegraph");
  expect(entry.description).toBe(manifest.description);
});

test("the plugin has two classic command hooks, one module, and no MCP server", () => {
  expect(hooks.modules).toStrictEqual(["./register.ts"]);
  expect(Object.keys(hooks.hooks).sort()).toStrictEqual([
    "PostToolUse",
    "SessionStart",
  ]);
  expect(
    Object.values(hooks.hooks)
      .flat()
      .flatMap((g) => g.hooks).length,
  ).toBe(2);
  expect(fs.existsSync(path.join(PLUGIN, "hooks/register.ts"))).toBe(true);
  expect(fs.existsSync(path.join(PLUGIN, ".mcp.json"))).toBe(false);
  expect(manifest.mcpServers).toBe(undefined);
});

test("the plugin works alone: a copy of the plugin folder runs its hook with no other plugin", async () => {
  const t = await setUp();
  const copy = path.join(t.dir, "alone", "claudetto-codegraph");
  fs.cpSync(PLUGIN, copy, { recursive: true });
  const r = runHook(
    "session-start",
    { cwd: t.project },
    t.env,
    path.join(copy, "slices/graph/adapters/hook.ts"),
  );
  expect(r.out?.hookSpecificOutput.additionalContext).not.toBe(undefined);
});

const check = (env: Env, cwd: string, args: string[] = []) =>
  run(
    process.execPath,
    [
      "--no-env-file",
      path.join(PLUGIN, "bin/claudetto-codegraph-check"),
      ...args,
    ],
    { cwd, env },
  );

test("the check changes nothing when PATH has no codegraph", async () => {
  const t = await setUp({ installed: false });
  const r = check(t.env, t.project);
  expect(r.status).toBe(0);
  expect(fs.readdirSync(t.project)).toStrictEqual([".codegraph"]);
  expect(await t.log()).toStrictEqual([]);
});

test("the check runs only `--version` with an index, and exits 0 with none", async () => {
  const none = await setUp({ index: false });
  expect(check(none.env, none.project).status).toBe(0);
  const some = await setUp();
  expect(check(some.env, some.project).status).toBe(0);
  expect(await some.log()).toStrictEqual(["--version"]);
});

test("the check tells a failed CLI from a missing CLI", async () => {
  const failed = await setUp();
  const r = check(
    { ...failed.env, FAKE_EXIT: "2", FAKE_STDERR: "broken db" },
    failed.project,
  );
  expect(r.status).toBe(0);
  expect(r.stdout).toContain("broken db");
  expect(r.stdout).not.toContain(INSTALL_COMMAND);
  const missing = await setUp({ installed: false });
  expect(check(missing.env, missing.project).stdout).toContain(INSTALL_COMMAND);
});

test("`--mcp` prints the add and remove commands, and runs no `codegraph` command", async () => {
  const t = await setUp();
  const r = check(t.env, t.project, ["--mcp"]);
  expect(r.status).toBe(0);
  expect(r.stdout).toContain(MCP_ADD_COMMAND);
  expect(r.stdout).toContain(MCP_REMOVE_COMMAND);
  expect(await t.log()).toStrictEqual([]);
});

test("an unknown argument exits 2 with the usage line, and runs no `codegraph` command", async () => {
  const t = await setUp();
  const r = check(t.env, t.project, ["--mpc"]);
  expect(r.status).toBe(2);
  expect(r.stderr).toContain("Usage: claudetto-codegraph-check [--mcp]");
  expect(await t.log()).toStrictEqual([]);
});

test("a default install ships the skill and no MCP server, and the skill gives the MCP command", async () => {
  expect(slice.skills).toStrictEqual(["codegraph"]);
  const skill = await Bun.file(
    path.join(PLUGIN, "skills/codegraph/SKILL.md"),
  ).text();
  expect(skill).toContain(MCP_ADD_COMMAND);
  expect(JSON.stringify(manifest)).not.toContain("codegraph serve");
});

test("no hook run calls codegraph `install` or `init`, with an index or without one", async () => {
  const payloads = {
    "session-start": (project: string) => ({ cwd: project }),
    sync: (project: string) => ({ cwd: project, tool_name: "Edit" }),
  };
  for (const index of [true, false]) {
    const t = await setUp({ index });
    for (const [mode, payload] of Object.entries(payloads))
      runHook(mode, payload(t.project), t.env);
    const subcommands = (await t.log()).map((line) => line.split(" ")[0]);
    if (index)
      expect(subcommands.length > 0, "the hooks called the CLI").toBeTruthy();
    expect(
      subcommands.filter((c) => c === "install" || c === "init"),
      `index ${index}: ${subcommands}`,
    ).toStrictEqual([]);
  }
});
