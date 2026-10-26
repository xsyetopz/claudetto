// `claudetto-setup --inventory` prints one JSON object, writes no file, and holds no identity (task 3.3 of change `release-0-3-0-alpha-2`, spec `setup`, "Inventory").

import { expect, test } from "bun:test";
import { mkdtemp, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { main } from "../../../plugins/claudetto/modules/setup/adapters/cli.ts";
import { runMain } from "../../support/setup-run.ts";

const EMAIL = "someone@example.com";
const ORG = "Example Org";
const UUID = "0b5c1f8e-2f5a-4c1e-9a7e-3d1f0c2b4a6d";
const SKILL =
  "---\nname: find-docs\ndescription: Gets docs of a library.\n---\n\nBody.\n";

/** Each file under `dir` with its text, to show that a run writes nothing. */
const snapshot = async (dir: string): Promise<Record<string, string>> => {
  const names = await readdir(dir, { recursive: true });
  const out: Record<string, string> = {};
  for (const name of names.sort()) {
    const file = Bun.file(path.join(dir, name));
    if ((await file.stat()).isFile()) out[name] = await file.text();
  }
  return out;
};

const runInventory = async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "inventory-"));
  const core = path.resolve("plugins/claudetto");
  const files: Record<string, unknown> = {
    ".claude.json": {
      oauthAccount: {
        emailAddress: EMAIL,
        organizationName: ORG,
        organizationUuid: UUID,
        accountUuid: UUID,
        organizationRateLimitTier: "default_claude_max_20x",
      },
      mcpServers: { "apple-docs": { command: "npx" } },
      projects: { [dir]: { mcpServers: { mine: { command: "x" } } } },
    },
    ".mcp.json": { mcpServers: { shared: { command: "y" } } },
    "settings.json": {
      syncClaudeAiSkills: true,
      enabledPlugins: {
        "claudetto@claudetto": true,
        "claudetto-docs@claudetto": true,
        "cc-plugin-you-should-know@builtin": true,
        "swift-lsp@official": true,
      },
    },
    "plugins/known_marketplaces.json": {
      official: { installLocation: path.join(dir, "market") },
    },
    "market/.claude-plugin/marketplace.json": {
      plugins: [
        {
          name: "swift-lsp",
          description: "Swift language server",
          lspServers: { s: { extensionToLanguage: { ".swift": "swift" } } },
        },
      ],
    },
    "plugins/installed_plugins.json": {
      version: 2,
      plugins: {
        "claudetto@claudetto": [{ scope: "user", installPath: core }],
      },
    },
  };
  for (const [file, data] of Object.entries(files))
    await Bun.write(path.join(dir, file), JSON.stringify(data));
  await Bun.write(path.join(dir, "skills/find-docs/SKILL.md"), SKILL);
  await Bun.write(path.join(dir, ".claude/skills/local/SKILL.md"), "Body.");
  const before = await snapshot(dir);
  const { status, text } = await runMain(dir, ["--inventory"]);
  return { status, text, before, after: await snapshot(dir) };
};

test("`--inventory` prints one JSON object with each part of the inventory, and writes no file", async () => {
  const { status, text, before, after } = await runInventory();
  expect(status).toBe(0);
  const inventory = JSON.parse(text);
  expect(Object.keys(inventory)).toStrictEqual([
    "plan",
    "plugins",
    "builtins",
    "mcpServers",
    "skills",
    "claudeAiSync",
    "openspec",
    "rules",
    "memoryFiles",
    "conflicts",
  ]);
  expect(inventory.plan).toStrictEqual({
    tier: "default_claude_max_20x",
    cap: 5,
  });
  expect(inventory.plugins.map((p: { id: string }) => p.id)).toStrictEqual([
    "claudetto@claudetto",
    "claudetto-docs@claudetto",
    "swift-lsp@official",
  ]);
  expect(inventory.builtins["cc-plugin-you-should-know@builtin"]).toBe(true);
  expect(inventory.builtins["cc-plugin-tips@builtin"]).toBeNull();
  expect(inventory.claudeAiSync).toStrictEqual({
    syncClaudeAiSkills: true,
    syncClaudeAiPlugins: null,
    ENABLE_CLAUDEAI_MCP_SERVERS: null,
  });
  expect(inventory.conflicts).toContainEqual({
    key: "enabledPlugins.cc-plugin-you-should-know@builtin",
    user: true,
    snippet: false,
  });
  expect(after).toStrictEqual(before);
});

test("Duplicate Skill: the inventory names `find-docs` as a copy of `claudetto:find-docs`, with its docs text and size, next to a project skill", async () => {
  const { skills } = JSON.parse((await runInventory()).text);
  expect(skills).toStrictEqual([
    {
      name: "find-docs",
      scope: "user",
      description: "Gets docs of a library.",
      chars: "Gets docs of a library.".length,
      copyOf: "claudetto:find-docs",
    },
    {
      name: "local",
      scope: "project",
      description: "Body.",
      chars: 5,
    },
  ]);
});

test("each plugin row has its docs text, an LSP plugin of a marketplace entry has its file extensions, and Old Docs Plugin: `claudetto-docs` is named as removed with its uninstall command", async () => {
  const { plugins } = JSON.parse((await runInventory()).text);
  const core = await Bun.file(
    "plugins/claudetto/.claude-plugin/plugin.json",
  ).json();
  expect(plugins).toStrictEqual([
    { id: "claudetto@claudetto", description: core.description },
    {
      id: "claudetto-docs@claudetto",
      description: null,
      removed: "claude plugin uninstall claudetto-docs@claudetto",
    },
    {
      id: "swift-lsp@official",
      description: "Swift language server",
      lsp: [".swift"],
    },
  ]);
});

test("Unused MCP Server: the inventory lists `apple-docs` with the scope `user`, next to the `local` and `project` servers", async () => {
  const { mcpServers } = JSON.parse((await runInventory()).text);
  expect(mcpServers).toStrictEqual([
    { name: "apple-docs", scope: "user" },
    { name: "mine", scope: "local" },
    { name: "shared", scope: "project" },
  ]);
});

test("No Identity in the Output: the inventory holds no email address, organization name, or UUID", async () => {
  const { text } = await runInventory();
  expect(text).not.toContain(EMAIL);
  expect(text).not.toContain(ORG);
  expect(text).not.toMatch(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
  );
});

test("`--inventory` with `--apply` exits with code 2", async () => {
  const io = { log: () => {}, error: () => {} };
  expect(await main(["--inventory", "--apply"], {}, os.tmpdir(), io)).toBe(2);
});
