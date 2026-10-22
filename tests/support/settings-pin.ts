// The never-set settings of claudetto, and the check of a settings object against the generated schema and that list.
// `tests/claudetto/settings-pin.test.ts` pins the wiki snippet with them, and `tests/claudetto/plugin-settings.test.ts` pins the plugin file.
// The never-set list lives here, because `lib/` ships to users and only the tests read it.
// The wiki page `Off-Switches` lists the same entries.

import path from "node:path";
import { REPO } from "./repo.ts";
import { validate } from "./validate.ts";

/** A parsed `settings.json` block: the keys that the tests read, and any other key. */
export type Settings = {
  env?: Record<string, string | undefined>;
  permissions?: { ask?: string[] };
  [key: string]: unknown;
};

export const SCHEMA = JSON.parse(
  await Bun.file(path.join(REPO, "schemas/claude-code-settings.json")).text(),
);

/** The settings keys that are never set, with the reason for each. */
export const NEVER_SET_KEYS = {
  disableAllHooks: "stops all hooks",
  allowManagedHooksOnly: "stops the hooks of plugins",
  strictPluginOnlyCustomization: "stops customization by the user",
  disableSideloadFlags: "stops the flags that load a plugin folder",
  alwaysThinkingEnabled: "forces thinking on every model",
  allowAllClaudeAiMcps: "turns on every claude.ai connector",
  claudeMd: "replaces the project instructions",
  attribution:
    "the attribution slice adds the lines to each commit and pull request",
};

/**
 * The `env` entries that are never set.
 * `value` is the one value that is banned, or `null` when any value is banned.
 */
export const NEVER_SET_ENV = [
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
export const neverSetViolations = (settings: Settings): string[] => {
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
};

/** The errors of `settings`: schema errors and never-set names. */
export const problems = (settings: Settings): string[] => [
  ...validate(settings, SCHEMA),
  ...neverSetViolations(settings).map((n) => `never set: ${n}`),
];

/** Each name that `snippet` writes, with the settings that set only it: an env name, `permissions.<key>`, or a top-level key other than `$schema`. */
export const snippetLevers = (snippet: {
  [key: string]: unknown;
  env?: object;
  permissions?: object;
}): Record<string, Settings> => {
  const { $schema: _schema, env = {}, permissions = {}, ...keys } = snippet;
  return Object.fromEntries([
    ...Object.entries(keys).map(([key, value]) => [key, { [key]: value }]),
    ...Object.entries(env).map(([name, value]) => [
      name,
      { env: { [name]: value } },
    ]),
    ...Object.entries(permissions).map(([key, value]) => [
      `permissions.${key}`,
      { permissions: { [key]: value } },
    ]),
  ]);
};
