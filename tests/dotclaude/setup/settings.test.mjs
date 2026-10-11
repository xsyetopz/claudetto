// Runs of `skills/setup/scripts/settings.mjs`, the settings step of setup.
// Each run uses a temporary `CLAUDE_CONFIG_DIR` and project folder, so no real settings file changes.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { mergeSettings } from "../../../plugins/dotclaude/lib/merge.mjs";
import {
  DOCS_SNIPPET,
  FABLE,
  MYTHOS,
  SNIPPET,
} from "../../../plugins/dotclaude/lib/snippet.mjs";
import { PLUGINS, REPO, tmpDir } from "../../support/repo.mjs";

const PLUGIN = path.join(PLUGINS, "dotclaude");
const SCRIPT = path.join(PLUGIN, "skills/setup/scripts/settings.mjs");
// The status line commands hold the plugin folder with forward slashes on each platform.
const SLASHED = PLUGIN.replaceAll("\\", "/");

/** A temporary config folder and project folder. */
function sandbox() {
  const root = tmpDir("dc-settings");
  const d = {
    config: path.join(root, "config"),
    project: path.join(root, "project"),
  };
  for (const dir of Object.values(d)) fs.mkdirSync(dir);
  return d;
}

const run = (d, args) =>
  spawnSync(process.execPath, [SCRIPT, ...args], {
    encoding: "utf8",
    env: { CLAUDE_CONFIG_DIR: d.config, CLAUDE_PROJECT_DIR: d.project },
  });

const userFile = (d) => path.join(d.config, "settings.json");
const readUser = (d) => JSON.parse(fs.readFileSync(userFile(d), "utf8"));
const writeUser = (d, settings) =>
  fs.writeFileSync(userFile(d), JSON.stringify(settings));

test("a preview writes no settings file", () => {
  const d = sandbox();
  const r = run(d, []);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(fs.existsSync(userFile(d)), false);
});

test("`--apply` writes the snippet keys with the plugin folder in the status line commands", () => {
  const d = sandbox();
  assert.equal(run(d, ["--apply"]).status, 0);
  const s = readUser(d);
  assert.equal(s.env.DISABLE_COMPACT, "1");
  assert.equal(s.env.CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT, "1");
  assert.equal(s.autoCompactEnabled, false);
  assert.equal(
    s.statusLine.command,
    `node "${SLASHED}/features/statusline/cli.mjs"`,
  );
  assert.equal(
    s.subagentStatusLine.command,
    `node "${SLASHED}/features/statusline/subagent-cli.mjs"`,
  );
  assert.equal(
    fs.existsSync(path.join(PLUGIN, "features/statusline/cli.mjs")),
    true,
  );
});

test("a second `--apply` changes nothing", () => {
  const d = sandbox();
  run(d, ["--apply"]);
  const before = fs.readFileSync(userFile(d), "utf8");
  const r = run(d, ["--apply"]);
  assert.equal(r.status, 0);
  assert.equal(fs.readFileSync(userFile(d), "utf8"), before);
});

test("`--apply` keeps the other keys and rules of the user", () => {
  const d = sandbox();
  writeUser(d, {
    theme: "dark",
    permissions: { allow: ["Bash(mytool *)"] },
    enabledPlugins: { "x@y": true },
  });
  run(d, ["--apply"]);
  const s = readUser(d);
  assert.equal(s.theme, "dark");
  assert.equal(s.permissions.allow[0], "Bash(mytool *)");
  assert.equal(s.permissions.allow.includes("Bash(git status *)"), true);
  assert.equal(s.enabledPlugins["x@y"], true);
});

const ORG = "00000000-0000-4000-8000-000000000001";

/** Write `.claude.json` with `ORG`, and a cached catalog file of `org` with `rows`. */
function catalog(d, rows, org = ORG) {
  fs.writeFileSync(
    path.join(d.config, ".claude.json"),
    JSON.stringify({ oauthAccount: { organizationUuid: ORG } }),
  );
  const dir = path.join(d.config, "cache/model-catalog");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, `${org}-abc123-cc.json`),
    JSON.stringify({ version: 2, catalog: { config: { models: rows } } }),
  );
}

const hasMythos = (d) => {
  const models = readUser(d).availableModels;
  return models.includes(MYTHOS) && !models.includes(FABLE);
};

test("a catalog of the account that offers Mythos puts Mythos in place of Fable", () => {
  const d = sandbox();
  catalog(d, [
    { id: FABLE, section: "main" },
    { id: MYTHOS, section: "overflow" },
  ]);
  assert.match(run(d, ["--apply"]).stdout, /offers claude-mythos-5-1/);
  assert.equal(hasMythos(d), true);
});

test("a disabled or deprecated Mythos row keeps Fable", () => {
  for (const row of [
    { id: MYTHOS, disabled: true },
    { id: MYTHOS, section: "deprecated" },
  ]) {
    const d = sandbox();
    catalog(d, [row]);
    run(d, ["--apply"]);
    assert.equal(hasMythos(d), false);
  }
});

test("a Mythos row in the catalog of another organization keeps Fable", () => {
  const d = sandbox();
  catalog(d, [{ id: MYTHOS }], "00000000-0000-4000-8000-000000000002");
  run(d, ["--apply"]);
  assert.equal(hasMythos(d), false);
});

test("a catalog file that is not valid JSON keeps Fable and does not stop setup", () => {
  const d = sandbox();
  catalog(d, []);
  fs.writeFileSync(
    path.join(d.config, `cache/model-catalog/${ORG}-abc123-cc.json`),
    "{",
  );
  assert.equal(run(d, ["--apply"]).status, 0);
  assert.equal(hasMythos(d), false);
});

test("a list that already holds Mythos keeps it with no catalog", () => {
  const d = sandbox();
  writeUser(d, { availableModels: ["claude-opus-5-5", MYTHOS] });
  run(d, ["--apply"]);
  assert.equal(hasMythos(d), true);
});

test("without Mythos, `availableModels` takes the list of the snippet", () => {
  const d = sandbox();
  writeUser(d, { availableModels: ["claude-opus-4-1"] });
  run(d, ["--apply"]);
  assert.deepEqual(readUser(d).availableModels, SNIPPET.availableModels);
});

test("an installed `dotclaude-docs` adds its allow rule and domain", () => {
  const d = sandbox();
  fs.mkdirSync(path.join(d.config, "plugins"));
  fs.writeFileSync(
    path.join(d.config, "plugins/installed_plugins.json"),
    JSON.stringify({ plugins: { "dotclaude-docs@dotclaude": [] } }),
  );
  run(d, ["--apply"]);
  const s = readUser(d);
  assert.equal(
    s.permissions.allow.includes("Skill(dotclaude-docs:docs)"),
    true,
  );
  assert.equal(s.sandbox.network.allowedDomains.includes("context7.com"), true);
});

test("the local scope writes `.claude/settings.local.json` of the project", () => {
  const d = sandbox();
  run(d, ["--scope", "local", "--apply"]);
  assert.equal(
    fs.existsSync(path.join(d.project, ".claude/settings.local.json")),
    true,
  );
  assert.equal(fs.existsSync(userFile(d)), false);
});

test("an unknown scope exits 2 and writes nothing", () => {
  const d = sandbox();
  assert.equal(run(d, ["--scope", "global", "--apply"]).status, 2);
  assert.equal(fs.existsSync(userFile(d)), false);
});

test("a settings file that is not valid JSON exits 1 and stays the same", () => {
  const d = sandbox();
  fs.writeFileSync(userFile(d), "{ not json");
  assert.equal(run(d, ["--apply"]).status, 1);
  assert.equal(fs.readFileSync(userFile(d), "utf8"), "{ not json");
});

test("a scalar of the snippet replaces the value of the user, and the change line names the key", () => {
  const { settings, changes } = mergeSettings(
    { model: "claude-sonnet-5-5" },
    { model: "claude-opus-5-5" },
  );
  assert.equal(settings.model, "claude-opus-5-5");
  assert.equal(changes.length, 1);
  assert.equal(changes[0].key, "model");
});

// The wiki page shows the snippet that setup applies, so the two must hold the same keys.
test("the JSON blocks of `Settings-Snippet.md` equal the snippet constants of `lib/snippet.mjs`", () => {
  const text = fs.readFileSync(
    path.join(REPO, "wiki/settings/Settings-Snippet.md"),
    "utf8",
  );
  const [main, docs] = [...text.matchAll(/```json\n([\s\S]*?)\n```/g)].map(
    (m) => JSON.parse(m[1]),
  );
  const { $schema: _, ...keys } = main;
  assert.deepEqual(keys, SNIPPET);
  assert.deepEqual(docs, DOCS_SNIPPET);
});

test("a status line of another tool stays, and the preview says so", () => {
  const d = sandbox();
  const own = { type: "command", command: "ccstatusline", padding: 2 };
  writeUser(d, { statusLine: own });
  const r = run(d, ["--apply"]);
  assert.match(r.stdout, /Kept your statusLine/);
  assert.deepEqual(readUser(d).statusLine, own);
  assert.match(readUser(d).subagentStatusLine.command, /subagent-cli\.mjs/);
});

test("a 0.27.0 launcher stub in the status line is replaced", () => {
  const d = sandbox();
  writeUser(d, {
    statusLine: {
      type: "command",
      command: `node "${d.config}/dotclaude/statusline.mjs"`,
    },
  });
  run(d, ["--apply"]);
  assert.equal(
    readUser(d).statusLine.command,
    `node "${SLASHED}/features/statusline/cli.mjs"`,
  );
});

test("the project scope writes no status line, because its path is of one computer", () => {
  const d = sandbox();
  const r = run(d, ["--scope", "project", "--apply"]);
  assert.match(r.stdout, /Project settings get no status line/);
  const s = JSON.parse(
    fs.readFileSync(path.join(d.project, ".claude/settings.json"), "utf8"),
  );
  assert.equal(s.statusLine, undefined);
  assert.equal(s.subagentStatusLine, undefined);
  assert.equal(s.env.DISABLE_COMPACT, "1");
});

test("a scalar where the snippet has an object gets its own change line", () => {
  const { changes } = mergeSettings(
    { sandbox: true },
    { sandbox: { enabled: true } },
  );
  assert.deepEqual(
    changes.map((c) => c.key),
    ["sandbox", "sandbox.enabled"],
  );
});
