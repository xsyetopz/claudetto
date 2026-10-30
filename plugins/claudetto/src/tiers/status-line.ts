// User settings do not expand `${CLAUDE_PLUGIN_ROOT}`, and the plugin cache holds one folder per version, so the shell picks the newest at each run.
export const LAUNCHER_PATH = `$(ls -d "\${CLAUDE_CONFIG_DIR:-$HOME/.claude}"/plugins/cache/claudetto/claudetto/*/ | sort -V | tail -1)bin/claudetto-statusline`;

export const STATUSLINE_COMMAND = `bun --no-env-file "${LAUNCHER_PATH}"`;

/** Seconds between runs with no event, so the limit and cache countdowns move while the session is idle. */
const REFRESH_S = 5;

export const STATUS_LINE_KEYS = ["statusLine", "subagentStatusLine"] as const;

export const statusLineSnippet = () => ({
	statusLine: {
		type: "command",
		command: STATUSLINE_COMMAND,
		refreshInterval: REFRESH_S,
	},
	subagentStatusLine: {
		type: "command",
		command: `${STATUSLINE_COMMAND} --subagent`,
	},
});
