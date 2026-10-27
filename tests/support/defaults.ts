// The default of each env var and settings key with a single value that the profile sets, for Claude Code 2.1.300 on the 5.5 models
// (spec `prompt-profile`, "No setting that equals the default").
// `value` is the value that has the same effect as no entry, or `null` when no value has that effect.
// The sources are the docs of 2.1.300 (`external/cc-2.1.300/docs/env.md`), the descriptions of `schemas/claude-code-settings.json`,
// the `configure/env-vars` pages of `claude-code-docs` for 2.1.306,
// and, for a name that the docs do not list, the bundle of 2.1.301 (`external/cc-2.1.301/strings.txt`).

import type { Settings } from "./settings-pin.ts";

type Value = string | number | boolean | null;

/** The default of each env var. An off switch defaults to `0`. */
export const ENV_DEFAULTS: Readonly<Record<string, Value>> = {
	// The default percentage depends on the model, and a value above it is ignored.
	CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: null,
	// With no entry, the main conversation gets 1 hour for a subscription within its included usage, and 5 minutes for an API key.
	CLAUDE_CODE_PROMPT_CACHE_TTL: null,
	// With no entry, Claude Code connects in a supported IDE, and `true` forces a connection.
	CLAUDE_CODE_AUTO_CONNECT_IDE: null,
	CLAUDE_CODE_DISABLE_ADVISOR_TOOL: "0",
	CLAUDE_CODE_DISABLE_CFC_PROMPT: "0",
	CLAUDE_CODE_DISABLE_CRON: "0",
	CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS: "0",
	CLAUDE_CODE_DISABLE_FAST_MODE: "0",
	CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY: "0",
	CLAUDE_CODE_DISABLE_TERMINAL_TITLE: "0",
	// Fork mode is on by default in 2.1.302, and `0` turns it off, so no value has the effect of no entry.
	CLAUDE_CODE_FORK_SUBAGENT: null,
	CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL: "0",
	// The env var negates the setting `includeGitInstructions`, which is on by default.
	CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS: "0",
	// With no entry, the settings key and a feature flag choose the mode.
	CLAUDE_CODE_TOTAL_TOKENS_REMINDER: null,
	// With no entry, a rollout check chooses.
	CLAUDE_CODE_BASH_OUTPUT_AUDIENCE_NOTE: null,
	// With no entry, a server gate chooses.
	CLAUDE_CODE_SILENT_TURN_REMINDER: null,
	CLAUDE_CODE_MEMORY_SUBAGENT_APPEND: "0",
	// With no entry, the count is 3 on the Max 20x, Team, and Enterprise plans, and 1 on other plans.
	CLAUDE_CODE_PLAN_V2_AGENT_COUNT: null,
	CLAUDE_CODE_PLAN_V2_EXPLORE_AGENT_COUNT: "3",
	CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS: "20",
	// Not in the docs. The bundle reads the flag `tengu_soft_slate_nudge` with the default `baseline`.
	CLAUDE_CODE_TODO_REMINDER_MODE: "baseline",
	// Each value opts out, also `0`.
	DISABLE_ERROR_REPORTING: null,
	DISABLE_EXTRA_USAGE_COMMAND: "0",
	DISABLE_FEEDBACK_COMMAND: "0",
	DISABLE_INSTALL_GITHUB_APP_COMMAND: "0",
	// With no entry, a logged-in user gets the claude.ai MCP servers (`configure/env-vars/plugins-and-mcp`).
	ENABLE_CLAUDEAI_MCP_SERVERS: "true",
	// With no entry, the limits are 4096 and 16384 characters, and no one value has both (`extend/mcp/runtime`).
	CLAUDE_CODE_MAX_MCP_DESCRIPTION_LENGTH: null,
};

/** The default of each settings key with a single value. */
export const SETTINGS_DEFAULTS: Readonly<Record<string, Value>> = {
	autoCompactWindow: null,
	// With no entry, a server default chooses.
	autoDreamEnabled: null,
	autoMemoryEnabled: true,
	disableAgentView: false,
	// The 2.1.309 bundle defaults it to `true` (design D2 of `release-0-3-0-alpha-2`).
	idleCompaction: true,
	syncClaudeAiPlugins: true,
	syncClaudeAiSkills: true,
	awaySummaryEnabled: true,
	modelProposedGoals: "auto",
	disableBundledSkills: false,
	disableClaudeAiConnectors: false,
	disableRemoteControl: false,
	enableArtifact: true,
	// With no entry, the plan chooses.
	enableWorkflows: null,
	fastMode: false,
	// With no entry, the plan chooses (`default`).
	model: null,
	showClearContextOnPlanAccept: false,
	feedbackDrafts: "notify",
	outputStyle: "default",
	promptSuggestionEnabled: true,
	spinnerTipsEnabled: true,
	useAutoModeDuringPlan: true,
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
