// The shape of claudetto-codegraph: manifest, marketplace entry, the check, and the rule that
// the add-on works alone (design D24, D26, D51).

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { INSTALL_COMMAND } from "../../plugins/claudetto-codegraph/slices/graph/graph.ts";
import { slice } from "../../plugins/claudetto-codegraph/slices/graph/slice.ts";
import { type Env, REPO } from "../support/repo.ts";
import { PLUGIN, run, setUp } from "./fake-cli.ts";

const json = (file: string) => Bun.file(file).json();
const manifest: { description: string; mcpServers?: unknown } = await json(
  path.join(PLUGIN, ".claude-plugin/plugin.json"),
);
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

test("the plugin has no hook module and no MCP server", () => {
  expect(fs.existsSync(path.join(PLUGIN, "hooks"))).toBe(false);
  expect(fs.existsSync(path.join(PLUGIN, ".mcp.json"))).toBe(false);
  expect(manifest.mcpServers).toBe(undefined);
});

test("the plugin works alone: a copy of the plugin folder runs its check with no other plugin", async () => {
  const t = await setUp();
  const copy = path.join(t.dir, "alone", "claudetto-codegraph");
  fs.cpSync(PLUGIN, copy, { recursive: true });
  const r = run(
    process.execPath,
    ["--no-env-file", path.join(copy, "bin/claudetto-codegraph-check")],
    { cwd: t.project, env: t.env },
  );
  expect(r.stdout).toContain("9.9.9");
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

test("an unknown argument exits 2 with the usage line, and runs no `codegraph` command", async () => {
  const t = await setUp();
  const r = check(t.env, t.project, ["--mcp"]);
  expect(r.status).toBe(2);
  expect(r.stderr).toContain("Usage: claudetto-codegraph-check");
  expect(await t.log()).toStrictEqual([]);
});

test("`--help` prints the usage line and exits 0", async () => {
  const t = await setUp();
  const r = check(t.env, t.project, ["--help"]);
  expect(r.status).toBe(0);
  expect(r.stdout).toContain("Usage: claudetto-codegraph-check");
  expect(await t.log()).toStrictEqual([]);
});

test("a default install ships the skill and no MCP server", () => {
  expect(slice.skills).toStrictEqual(["codegraph"]);
  expect(slice.hooks).toBe(undefined);
  expect(JSON.stringify(manifest)).not.toContain("codegraph serve");
});
