// The facts that the drift check compares with the settings snippet of the wiki.
// This file is in the import graph of the hooks module, so it has no `node:` import.

/** The built-in plugins that the snippet turns off with `enabledPlugins`. */
export const OFF_PLUGINS = [
  "cc-plugin-agents-md@builtin",
  "cc-plugin-claude-test@builtin",
  "cc-plugin-diff@builtin",
  "cc-plugin-mermaid@builtin",
  "cc-plugin-mods-guide@builtin",
  "cc-plugin-responsive-mode@builtin",
  "cc-plugin-telemetry@builtin",
  "cc-plugin-tips@builtin",
  "cc-plugin-you-should-know@builtin",
];

/** The `source` of a skill in the context breakdown when `syncClaudeAiSkills` brought it. */
export const SYNCED_SOURCE = "syncedSkills";

/**
 * The variables that override the `model` and `effort` of the agent files.
 */
export const OVERRIDE_ENV = [
  "CLAUDE_CODE_EFFORT_LEVEL",
  "CLAUDE_CODE_SUBAGENT_MODEL_FORCE",
];

/** The `env` names that Claude Code 2.1.301 never reads, and the setting that does the work. */
export const UNREAD_ENV: Record<string, string> = {
  BASH_OUTPUT_MAX_CHARS: "the setting `bashOutputMaxChars`",
};

/** The `env` name that acts only when `COMPACT_OFF_ENV` is on (Claude Code 2.1.301). */
export const WINDOW_ENV = "CLAUDE_CODE_MAX_CONTEXT_TOKENS";

/** The `env` name that turns compaction off, so that `WINDOW_ENV` acts. */
export const COMPACT_OFF_ENV = "DISABLE_COMPACT";
