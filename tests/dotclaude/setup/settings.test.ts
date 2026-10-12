// Runs of `dotclaude-setup settings`, the settings step of setup.
// Each run uses a temporary `CLAUDE_CONFIG_DIR` and project folder, so no real settings file changes.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
  FABLE,
  MYTHOS,
  mergeSettings,
  SNIPPET,
} from "../../../plugins/dotclaude/slices/setup/domain/merge.ts";
import type { Json } from "../../../plugins/dotclaude/slices/setup/domain/types.ts";
import { DOCS_SNIPPET } from "../../../plugins/dotclaude/slices/setup/texts.ts";
import { PLUGINS, REPO, tmpDir } from "../../support/repo.ts";

type Sandbox = { config: string; project: string };
type CatalogRow = { id: string; section?: string; disabled?: boolean };

const PLUGIN = path.join(PLUGINS, "dotclaude");
const SCRIPT = path.join(PLUGIN, "bin/dotclaude-setup");
// The status line commands hold the plugin folder with forward slashes on each platform.
const SLASHED = PLUGIN.replaceAll("\\", "/");

/** A temporary config folder and project folder. */
const sandbox = () => {
  const root = tmpDir("dc-settings");
  const d = {
    config: path.join(root, "config"),
    project: path.join(root, "project"),
  };
  for (const dir of Object.values(d)) fs.mkdirSync(dir);
  return d;
};

const run = (d: Sandbox, args: string[]) => {
  const r = Bun.spawnSync(
    [process.execPath, "--no-env-file", SCRIPT, "settings", ...args],
    {
      env: { CLAUDE_CONFIG_DIR: d.config, CLAUDE_PROJECT_DIR: d.project },
    },
  );
  return {
    status: r.exitCode,
    stdout: r.stdout.toString(),
    stderr: r.stderr.toString(),
  };
};

const userFile = (d: Sandbox) => path.join(d.config, "settings.json");
const readUser = async (d: Sandbox) =>
  JSON.parse(await Bun.file(userFile(d)).text());
const writeUser = (d: Sandbox, settings: Json) =>
  Bun.write(userFile(d), JSON.stringify(settings));

test("a preview writes no settings file", () => {
  const d = sandbox();
  const r = run(d, []);
  expect(r.status, r.stderr).toBe(0);
  expect(fs.existsSync(userFile(d))).toBe(false);
});

test("`--apply` writes the snippet keys with the plugin folder in the status line commands", async () => {
  const d = sandbox();
  expect(run(d, ["--apply"]).status).toBe(0);
  const s = await readUser(d);
  expect(s.env.DISABLE_COMPACT).toBe("1");
  expect(s.env.CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT).toBe("1");
  expect(s.autoCompactEnabled).toBe(false);
  expect(s.statusLine.command).toBe(
    `bun --no-env-file "${SLASHED}/bin/dotclaude-statusline"`,
  );
  expect(s.subagentStatusLine.command).toBe(
    `bun --no-env-file "${SLASHED}/bin/dotclaude-statusline" --subagent`,
  );
  expect(fs.existsSync(path.join(PLUGIN, "bin/dotclaude-statusline"))).toBe(
    true,
  );
});

test("a second `--apply` changes nothing", async () => {
  const d = sandbox();
  run(d, ["--apply"]);
  const before = await Bun.file(userFile(d)).text();
  const r = run(d, ["--apply"]);
  expect(r.status).toBe(0);
  expect(await Bun.file(userFile(d)).text()).toBe(before);
});

test("`--apply` keeps the other keys and rules of the user", async () => {
  const d = sandbox();
  await writeUser(d, {
    theme: "dark",
    permissions: { allow: ["Bash(mytool *)"] },
    enabledPlugins: { "x@y": true },
  });
  run(d, ["--apply"]);
  const s = await readUser(d);
  expect(s.theme).toBe("dark");
  expect(s.permissions.allow[0]).toBe("Bash(mytool *)");
  expect(s.permissions.allow.includes("Bash(git status *)")).toBe(true);
  expect(s.enabledPlugins["x@y"]).toBe(true);
});

const ORG = "00000000-0000-4000-8000-000000000001";

/** Write `.claude.json` with `ORG`, and a cached catalog file of `org` with `rows`. */
const catalog = async (d: Sandbox, rows: CatalogRow[], org = ORG) => {
  await Bun.write(
    path.join(d.config, ".claude.json"),
    JSON.stringify({ oauthAccount: { organizationUuid: ORG } }),
  );
  const dir = path.join(d.config, "cache/model-catalog");
  fs.mkdirSync(dir, { recursive: true });
  await Bun.write(
    path.join(dir, `${org}-abc123-cc.json`),
    JSON.stringify({ version: 2, catalog: { config: { models: rows } } }),
  );
};

const hasMythos = async (d: Sandbox) => {
  const models = (await readUser(d)).availableModels;
  return models.includes(MYTHOS) && !models.includes(FABLE);
};

test("a catalog of the account that offers Mythos puts Mythos in place of Fable", async () => {
  const d = sandbox();
  await catalog(d, [
    { id: FABLE, section: "main" },
    { id: MYTHOS, section: "overflow" },
  ]);
  expect(run(d, ["--apply"]).stdout).toMatch(/offers claude-mythos-5-1/);
  expect(await hasMythos(d)).toBe(true);
});

test("a disabled or deprecated Mythos row keeps Fable", async () => {
  for (const row of [
    { id: MYTHOS, disabled: true },
    { id: MYTHOS, section: "deprecated" },
  ]) {
    const d = sandbox();
    await catalog(d, [row]);
    run(d, ["--apply"]);
    expect(await hasMythos(d)).toBe(false);
  }
});

test("a Mythos row in the catalog of another organization keeps Fable", async () => {
  const d = sandbox();
  await catalog(d, [{ id: MYTHOS }], "00000000-0000-4000-8000-000000000002");
  run(d, ["--apply"]);
  expect(await hasMythos(d)).toBe(false);
});

test("a catalog file that is not valid JSON keeps Fable and does not stop setup", async () => {
  const d = sandbox();
  await catalog(d, []);
  await Bun.write(
    path.join(d.config, `cache/model-catalog/${ORG}-abc123-cc.json`),
    "{",
  );
  expect(run(d, ["--apply"]).status).toBe(0);
  expect(await hasMythos(d)).toBe(false);
});

test("a list that already holds Mythos keeps it with no catalog", async () => {
  const d = sandbox();
  await writeUser(d, { availableModels: ["claude-opus-5-5", MYTHOS] });
  run(d, ["--apply"]);
  expect(await hasMythos(d)).toBe(true);
});

test("without Mythos, `availableModels` takes the list of the snippet", async () => {
  const d = sandbox();
  await writeUser(d, { availableModels: ["claude-opus-4-1"] });
  run(d, ["--apply"]);
  expect((await readUser(d)).availableModels).toStrictEqual(
    SNIPPET["availableModels"],
  );
});

test("an installed `dotclaude-docs` adds its allow rule and domain", async () => {
  const d = sandbox();
  fs.mkdirSync(path.join(d.config, "plugins"));
  await Bun.write(
    path.join(d.config, "plugins/installed_plugins.json"),
    JSON.stringify({ plugins: { "dotclaude-docs@dotclaude": [] } }),
  );
  run(d, ["--apply"]);
  const s = await readUser(d);
  expect(s.permissions.allow.includes("Skill(dotclaude-docs:docs)")).toBe(true);
  expect(s.sandbox.network.allowedDomains.includes("context7.com")).toBe(true);
});

test("the local scope writes `.claude/settings.local.json` of the project", () => {
  const d = sandbox();
  run(d, ["--scope", "local", "--apply"]);
  expect(
    fs.existsSync(path.join(d.project, ".claude/settings.local.json")),
  ).toBe(true);
  expect(fs.existsSync(userFile(d))).toBe(false);
});

test("an unknown scope exits 2 and writes nothing", () => {
  const d = sandbox();
  expect(run(d, ["--scope", "global", "--apply"]).status).toBe(2);
  expect(fs.existsSync(userFile(d))).toBe(false);
});

test("a settings file that is not valid JSON exits 1 and stays the same", async () => {
  const d = sandbox();
  await Bun.write(userFile(d), "{ not json");
  expect(run(d, ["--apply"]).status).toBe(1);
  expect(await Bun.file(userFile(d)).text()).toBe("{ not json");
});

test("a scalar of the snippet replaces the value of the user, and the change line names the key", () => {
  const { settings, changes } = mergeSettings(
    { model: "claude-sonnet-5-5" },
    { model: "claude-opus-5-5" },
  );
  expect(settings["model"]).toBe("claude-opus-5-5");
  expect(changes.length).toBe(1);
  expect(changes[0]?.key).toBe("model");
});

// The wiki page shows the snippet that setup applies, so the two must hold the same keys.
test("the JSON blocks of `Settings-Snippet.md` equal the snippet constants of the `setup` slice", async () => {
  const text = await Bun.file(
    path.join(REPO, "wiki/settings/Settings-Snippet.md"),
  ).text();
  const [main, docs] = [...text.matchAll(/```json\n([\s\S]*?)\n```/g)].map(
    (m) => JSON.parse(m[1] as string),
  );
  const { $schema: _, ...keys } = main;
  expect(keys).toStrictEqual(SNIPPET);
  expect(docs).toStrictEqual(DOCS_SNIPPET);
});

test("a status line of another tool stays, and the preview says so", async () => {
  const d = sandbox();
  const own = { type: "command", command: "ccstatusline", padding: 2 };
  await writeUser(d, { statusLine: own });
  run(d, ["--apply"]);
  expect((await readUser(d)).statusLine).toStrictEqual(own);
  expect((await readUser(d)).subagentStatusLine.command).toBe(
    `bun --no-env-file "${SLASHED}/bin/dotclaude-statusline" --subagent`,
  );
});

test("a 0.27.0 launcher stub in the status line is replaced", async () => {
  const d = sandbox();
  await writeUser(d, {
    statusLine: {
      type: "command",
      command: `node "${d.config}/dotclaude/statusline.mjs"`,
    },
  });
  run(d, ["--apply"]);
  expect((await readUser(d)).statusLine.command).toBe(
    `bun --no-env-file "${SLASHED}/bin/dotclaude-statusline"`,
  );
});

test("the project scope writes no status line, because its path is of one computer", async () => {
  const d = sandbox();
  run(d, ["--scope", "project", "--apply"]);
  const s = JSON.parse(
    await Bun.file(path.join(d.project, ".claude/settings.json")).text(),
  );
  expect(s.statusLine).toBe(undefined);
  expect(s.subagentStatusLine).toBe(undefined);
  expect(s.env.DISABLE_COMPACT).toBe("1");
});

test("a scalar where the snippet has an object gets its own change line", () => {
  const { changes } = mergeSettings(
    { sandbox: true },
    { sandbox: { enabled: true } },
  );
  expect(changes.map((c) => c.key)).toStrictEqual([
    "sandbox",
    "sandbox.enabled",
  ]);
});
