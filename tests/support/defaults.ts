// The default of each env var and settings key with a single value that the profile sets, for Claude Code 2.1.300 on the 5.5 models
// (spec `prompt-profile`, "No setting that equals the default").
// `value` is the value that has the same effect as no entry, or `null` when no value has that effect.
// The sources are the docs of 2.1.300 (`external/cc-2.1.300/docs/env.md`), the descriptions of `schemas/claude-code-settings.json`,
// and, for a name that the docs do not list, the bundle of 2.1.301 (`external/cc-2.1.301/strings.txt`).

import type { Settings } from "./settings-pin.ts";

type Value = string | number | boolean | null;

/** The default of each env var. An off switch defaults to `0`. */
export const ENV_DEFAULTS: Readonly<Record<string, Value>> = {
  // The default percentage depends on the model, and a value above it is ignored.
  CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: null,
  // With no entry, Claude Code connects in a supported IDE, and `true` forces a connection.
  CLAUDE_CODE_AUTO_CONNECT_IDE: null,
  CLAUDE_CODE_DISABLE_CFC_PROMPT: "0",
  CLAUDE_CODE_DISABLE_CRON: "0",
  CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS: "0",
  CLAUDE_CODE_DISABLE_FAST_MODE: "0",
  CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY: "0",
  CLAUDE_CODE_DISABLE_TERMINAL_TITLE: "0",
  // Fork mode is on by default in 2.1.302, and `0` turns it off, so no value has the effect of no entry.
  CLAUDE_CODE_FORK_SUBAGENT: null,
  CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL: "0",
  CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS: "20",
  // The default depends on the model: Haiku 4.5, Sonnet 5, Opus 4.7, and older use the full prompt.
  // The user chose the entry `"1"` for each model (the plan `trim-0-2-0`, step 4).
  CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT: null,
  // With no entry, a subagent inherits the model of the main loop.
  CLAUDE_CODE_SUBAGENT_MODEL: null,
  // Not in the docs. The bundle reads the flag `tengu_soft_slate_nudge` with the default `baseline`.
  CLAUDE_CODE_TODO_REMINDER_MODE: "baseline",
  // Each value opts out, also `0`.
  DISABLE_ERROR_REPORTING: null,
  DISABLE_FEEDBACK_COMMAND: "0",
};

/** The default of each settings key with a single value. */
export const SETTINGS_DEFAULTS: Readonly<Record<string, Value>> = {
  autoCompactWindow: null,
  autoMemoryEnabled: true,
  awaySummaryEnabled: true,
  bashOutputMaxChars: 30000,
  disableAgentView: false,
  disableBundledSkills: false,
  disableClaudeAiConnectors: false,
  disableRemoteControl: false,
  enableArtifact: true,
  // With no entry, the plan chooses.
  enableWorkflows: null,
  enforceAvailableModels: false,
  fastMode: false,
  feedbackDrafts: "notify",
  feedbackSurveyRate: null,
  includeGitInstructions: true,
  // A cap of `max` clamps no level.
  maxEffortLevel: "max",
  // The default model depends on the plan.
  model: null,
  outputStyle: "default",
  // With no entry, the TTL is 1 hour on a subscription and 5 minutes on an API key.
  promptCacheTtl: null,
  promptSuggestionEnabled: true,
  spinnerTipsEnabled: true,
  syncClaudeAiPlugins: true,
  syncClaudeAiSkills: true,
};

/** The entries of `settings` with a single value, as `key` or `env.NAME`, each with its value. */
export const singleValues = (settings: Settings): [string, unknown][] => [
  ...Object.entries(settings.env ?? {}).map(
    ([name, value]): [string, unknown] => [`env.${name}`, value],
  ),
  ...Object.entries(settings).filter(
    ([key, value]) =>
      key !== "env" &&
      key !== "$schema" &&
      (typeof value !== "object" || value === null),
  ),
];

/** The default of an entry from `singleValues`, or `undefined` when the table has no row for it. */
export const defaultOf = (entry: string): Value | undefined =>
  entry.startsWith("env.")
    ? ENV_DEFAULTS[entry.slice("env.".length)]
    : SETTINGS_DEFAULTS[entry];

/** The entries of `settings` that equal their default. */
export const defaultViolations = (settings: Settings): string[] =>
  singleValues(settings)
    .filter(([entry, value]) => {
      const d = defaultOf(entry);
      return d !== undefined && d !== null && String(d) === String(value);
    })
    .map(([entry]) => entry);
