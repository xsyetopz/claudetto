export const SUBAGENT_MODEL_ENV = "CLAUDE_CODE_SUBAGENT_MODEL";

export interface EnvFlag {
	readonly name: string;
	readonly value: string;
}

/** A name the docs do not list, which the key check accepts only with the reading that backs it. */
export interface UnofficialFlag extends EnvFlag {
	readonly source: string;
}

export const ENV_FLAGS: readonly EnvFlag[] = [
	{ name: "CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS", value: "1" },
	{ name: "CLAUDE_CODE_DISABLE_CFC_PROMPT", value: "1" },
	{ name: "CLAUDE_CODE_DISABLE_ADVISOR_TOOL", value: "1" },
	{ name: "CLAUDE_CODE_DISABLE_CRON", value: "1" },
	{ name: "CLAUDE_CODE_FORK_SUBAGENT", value: "0" },
	{ name: "CLAUDE_CODE_AUTO_CONNECT_IDE", value: "false" },
	{ name: "CLAUDE_CODE_DISABLE_TERMINAL_TITLE", value: "1" },
	{ name: "CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY", value: "1" },
	{ name: "DISABLE_ERROR_REPORTING", value: "1" },
	{ name: "DISABLE_EXTRA_USAGE_COMMAND", value: "1" },
	{ name: "DISABLE_FEEDBACK_COMMAND", value: "1" },
	{ name: "DISABLE_INSTALL_GITHUB_APP_COMMAND", value: "1" },
	{ name: "CLAUDE_CODE_DISABLE_FAST_MODE", value: "1" },
	{ name: "ENABLE_CLAUDEAI_MCP_SERVERS", value: "false" },
	{ name: "CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS", value: "1" },
	{ name: "CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL", value: "1" },
];

export const UNOFFICIAL_ENV: readonly UnofficialFlag[] = [
	{
		name: "CLAUDE_CODE_THRIFTY_SONIC",
		value: "0",
		source:
			"`qvn()` of the `2.1.314` binary returns it before the `tengu_cozy_teapot` gate.",
	},
];

export const envFlags = (): Readonly<Record<string, string>> =>
	Object.fromEntries(
		[...ENV_FLAGS, ...UNOFFICIAL_ENV].map((flag) => [flag.name, flag.value]),
	);
