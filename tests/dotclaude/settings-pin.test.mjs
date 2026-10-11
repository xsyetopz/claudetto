// The pin test of the settings that dotclaude gives (task 25.22, design D35).
// The plugin `settings.json` and each JSON block of the wiki settings snippet must hold only keys of the generated schema,
// and none of the never-set keys.
// Each never-set key or env entry stops hooks or plugins, removes project instructions or attachments, or forces a model or effort.
// The never-set list lives here, because `lib/` ships to users and only this test reads it.
// The wiki page `Off-Switches` lists the same entries.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { REPO } from "../support/repo.mjs";
import { validate } from "./fixtures/validate.mjs";

const SCHEMA = JSON.parse(
  fs.readFileSync(path.join(REPO, "schemas/claude-code-settings.json"), "utf8"),
);

/** The settings keys that are never set, with the reason for each. */
const NEVER_SET_KEYS = {
  disableAllHooks: "stops all hooks",
  allowManagedHooksOnly: "stops the hooks of plugins",
  strictPluginOnlyCustomization: "stops customization by the user",
  disableSideloadFlags: "stops the flags that load a plugin folder",
  alwaysThinkingEnabled: "forces thinking on every model",
  allowAllClaudeAiMcps: "turns on every claude.ai connector",
  claudeMd: "replaces the project instructions",
};

/**
 * The `env` entries that are never set.
 * `value` is the one value that is banned, or `null` when any value is banned.
 */
const NEVER_SET_ENV = [
  {
    name: "CLAUDE_CODE_SIMPLE",
    value: null,
    reason: "turns off hooks, plugins, skills, and memory",
  },
  {
    name: "CLAUDE_CODE_SAFE_MODE",
    value: null,
    reason: "turns off hooks, plugins, skills, and memory",
  },
  {
    name: "CLAUDE_CODE_ENABLE_TASKS",
    value: "0",
    reason: "removes the task tools that the model uses",
  },
  {
    name: "CLAUDE_CODE_DISABLE_CLAUDE_MDS",
    value: null,
    reason: "removes the project instructions",
  },
  {
    name: "CLAUDE_CODE_DISABLE_ATTACHMENTS",
    value: null,
    reason: "removes the attachments",
  },
  {
    name: "CLAUDE_CODE_EFFORT_LEVEL",
    value: null,
    reason: "forces one effort on every model",
  },
  {
    name: "CLAUDE_CODE_SUBAGENT_MODEL_FORCE",
    value: null,
    reason: "forces the model of a subagent",
  },
  {
    name: "MAX_THINKING_TOKENS",
    value: null,
    reason: "forces a thinking budget",
  },
  {
    name: "CLAUDE_CODE_REMOVE_PROMPT_STRINGS",
    value: null,
    reason: "removes text of the system prompt",
  },
  {
    name: "CLAUDE_CODE_DISABLE_WEB_FETCH",
    value: null,
    reason: "removes the web fetch tool",
  },
  {
    name: "CLAUDE_CODE_BASH_EDIT_DIFF",
    value: "0",
    reason: "removes the edit diff of Bash",
  },
  {
    name: "CLAUDE_CODE_SKIP_PLUGIN_MCP_SERVERS",
    value: null,
    reason: "drops the MCP servers of plugins",
  },
  {
    name: "CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS",
    value: null,
    reason: "removes beta features",
  },
  {
    name: "DISABLE_INTERLEAVED_THINKING",
    value: null,
    reason: "removes thinking between tool calls",
  },
];

/** The names of the never-set entries that `settings` sets, as `key` or `env.NAME`. */
function neverSetViolations(settings) {
  const found = Object.keys(NEVER_SET_KEYS).filter(
    (key) => settings != null && Object.hasOwn(settings, key),
  );
  const env = settings?.env ?? {};
  for (const { name, value } of NEVER_SET_ENV)
    if (
      Object.hasOwn(env, name) &&
      (value === null || String(env[name]) === value)
    )
      found.push(`env.${name}`);
  return found;
}

/** The parsed JSON blocks of a Markdown file, or an empty list when the file is absent. */
function jsonBlocks(file) {
  const full = path.join(REPO, file);
  if (!fs.existsSync(full)) return [];
  const text = fs.readFileSync(full, "utf8");
  return [...text.matchAll(/```json\n([\s\S]*?)\n```/g)].map((m) =>
    JSON.parse(m[1]),
  );
}

/** The errors of `settings`: schema errors and never-set names. */
const problems = (settings) => [
  ...validate(settings, SCHEMA),
  ...neverSetViolations(settings).map((n) => `never set: ${n}`),
];

// The test reads the JSON blocks of `wiki/settings/Settings-Snippet.md`, so the snippet is pinned.
const SNIPPETS = [
  [
    "plugins/dotclaude/settings.json",
    [readJson("plugins/dotclaude/settings.json")],
  ],
  [
    "wiki/settings/Settings-Snippet.md",
    jsonBlocks("wiki/settings/Settings-Snippet.md"),
  ],
];

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(REPO, file), "utf8"));
}

// A docs lint: it pins the JSON blocks of the wiki pages, by design (task 25.22).
for (const [file, blocks] of SNIPPETS)
  test(`lint: each JSON block of \`${file}\` has only keys of the schema and no never-set key`, () => {
    for (const block of blocks) assert.deepEqual(problems(block), []);
  });

test("the plugin `settings.json` holds only `agent` and `subagentStatusLine`, the keys that a plugin may set", () => {
  const allowed = new Set(["agent", "subagentStatusLine"]);
  const extra = Object.keys(readJson("plugins/dotclaude/settings.json")).filter(
    (k) => !allowed.has(k),
  );
  assert.deepEqual(extra, []);
});

test("a fixture with `CLAUDE_CODE_EFFORT_LEVEL` fails, and the failure names it", () => {
  const fixture = {
    env: { CLAUDE_CODE_EFFORT_LEVEL: "high" },
    disableAllHooks: true,
  };
  assert.deepEqual(neverSetViolations(fixture), [
    "disableAllHooks",
    "env.CLAUDE_CODE_EFFORT_LEVEL",
  ]);
  assert.deepEqual(problems(fixture), [
    "never set: disableAllHooks",
    "never set: env.CLAUDE_CODE_EFFORT_LEVEL",
  ]);
});

test("a fixture with an unknown key fails, and the failure names the key", () => {
  assert.deepEqual(problems({ notAClaudeKey: true }), [
    '(root): unknown key "notAClaudeKey"',
  ]);
});

test("a fixture with a key of the schema and a never-set env entry passes the schema check and fails the pin", () => {
  const fixture = { model: "x", env: { CLAUDE_CODE_SIMPLE: "1" } };
  assert.deepEqual(validate(fixture, SCHEMA), []);
  assert.deepEqual(problems(fixture), ["never set: env.CLAUDE_CODE_SIMPLE"]);
});

test("a never-set entry with a banned value is flagged only for that value", () => {
  assert.deepEqual(
    neverSetViolations({ env: { CLAUDE_CODE_ENABLE_TASKS: "0" } }),
    ["env.CLAUDE_CODE_ENABLE_TASKS"],
  );
  assert.deepEqual(
    neverSetViolations({ env: { CLAUDE_CODE_ENABLE_TASKS: "1" } }),
    [],
  );
});

test("the settings snippet asks before each flag spelling of a recursive `rm`", () => {
  const asked = jsonBlocks("wiki/settings/Settings-Snippet.md").flatMap(
    (b) => b.permissions?.ask ?? [],
  );
  for (const rule of [
    "Bash(rm -*r*)",
    "Bash(rm -*R*)",
    "Bash(rm * -*r*)",
    "Bash(rm * -*R*)",
    "Bash(rm --recursive*)",
    "Bash(rm * --recursive*)",
  ])
    assert.ok(asked.includes(rule), rule);
});
