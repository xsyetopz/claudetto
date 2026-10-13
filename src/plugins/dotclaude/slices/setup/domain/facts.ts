// The facts that the drift check compares with the settings snippet of the wiki.
// Tests pin `TESTED_VERSION` to the schema file.
// This file is in the import graph of the hooks module, so it has no `node:` import.

/** The Claude Code version that this release of dotclaude is tested on. */
export const TESTED_VERSION = "2.1.296";

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
 * The ids of the system prompt sections of Claude Code 2.1.296, as `prompt.compose` lists them.
 * An id with a colon belongs to a plugin, so it is not here.
 * The ids after `memory` come only on some conditions, such as a flag, a model, or a deferred tool.
 * They are from the section list of the 2.1.296 bundle (`research/bundle-2.1.296.md`).
 */
export const ENGINE_SECTIONS = [
  "intro",
  "system",
  "doing_tasks",
  "actions",
  "tools",
  "tone",
  "lean_body",
  "communication",
  "pronouns",
  "action_caution",
  "session_guidance",
  "env_info_simple",
  "context_management",
  "heron_brook",
  "total_tokens",
  "memory",
  "task_continuity",
  "fable_identity",
  "tool_param_json",
  "tengu_silent_harbor",
  "bg-session",
  "brief",
  "focus_mode",
  "act_dont_rederive",
  "delivering_work_max",
  "overcorrection",
  "subagent_steer_delegation",
  "opus5_reduced_delegation",
  "tengu_slate_bittern",
  "brook_heron",
  "willow_tern",
  "autonomy_append",
  "endconv_deferred_hint",
];

/**
 * The dotclaude parts that a seated guard skips.
 * The guard sends the handlers of `prompt.compose` and `prompt.section` of tier `user` to the append tier (`research/mods-api.md` section 3).
 */
export const GUARD_SKIPS = [
  "the shared sections and the model variants of the system prompt (`prompt.compose`)",
  "the `context_management` text (`prompt.section`)",
];

/**
 * The variables that override the `model` and `effort` of the agent files.
 */
export const OVERRIDE_ENV = [
  "CLAUDE_CODE_EFFORT_LEVEL",
  "CLAUDE_CODE_SUBAGENT_MODEL_FORCE",
];
