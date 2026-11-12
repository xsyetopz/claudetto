type Env = Readonly<Record<string, string | undefined>>;

/** `env` without `ANTHROPIC_API_KEY`: Claude Code bills a key before it uses the subscription login, so a paid run drops the key. */
export const subscriptionEnv = (env: Env): Record<string, string | undefined> =>
	Object.fromEntries(
		Object.entries(env).filter(([name]) => name !== "ANTHROPIC_API_KEY"),
	);

/** Whether `env` holds the subscription login token (`claude setup-token`); an API key does not count. */
export const hasSubscriptionLogin = ({
	CLAUDE_CODE_OAUTH_TOKEN: token = "",
}: Env): boolean => token !== "";
