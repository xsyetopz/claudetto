// The environment variables a probe adds to a `claude` process, each as a small record to spread.

/** The variables that keep a session from reporting or updating itself. */
export const QUIET_ENV: Readonly<Record<string, string>> = {
	DISABLE_TELEMETRY: "1",
	DISABLE_ERROR_REPORTING: "1",
	DISABLE_AUTOUPDATER: "1",
};

/** Points the session at an API on `url`, such as a local proxy or a fake. */
export const baseUrlEnv = (url: string): Record<string, string> => ({
	ANTHROPIC_BASE_URL: url,
});

/** Moves the user-level config of the session to `dir`, so none of this machine's settings, memory, or plugins reaches it. */
export const configDirEnv = (dir: string): Record<string, string> => ({
	CLAUDE_CONFIG_DIR: dir,
});

/** A key that no real API accepts, which a fake API needs so the session has some key to send. */
export const FAKE_KEY = "sk-ant-fake";

/** The environment of a session against a fake API on `url`, with its config in `configDir` and its reporting and updates off. */
export const fakeApiEnv = (
	url: string,
	configDir: string,
): Record<string, string> => ({
	...baseUrlEnv(url),
	ANTHROPIC_API_KEY: FAKE_KEY,
	...configDirEnv(configDir),
	...QUIET_ENV,
});
