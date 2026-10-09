// The keys and env entries that the settings profile never sets.
// Each one stops hooks or plugins, removes project instructions or attachments, or forces a model or effort.
// A test fails when the profile sets any of them.
// The wiki page `Off-Switches` lists the same entries.

/** The settings keys that the profile never sets, with the reason for each. */
export const NEVER_SET_KEYS = {
  disableAllHooks: "stops all hooks",
  allowManagedHooksOnly: "stops the hooks of plugins",
  strictPluginOnlyCustomization: "stops customization by the user",
  disableSideloadFlags: "stops the flags that load a plugin folder",
  alwaysThinkingEnabled: "forces thinking on every model",
  allowAllClaudeAiMcps: "turns on every claude.ai connector",
  claudeMd: "replaces the project instructions",
};

/**
 * The `env` entries that the profile never sets.
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
export function neverSetViolations(settings) {
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
