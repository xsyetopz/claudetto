import type { HttpInit, On } from "claude-code";

/** Headers that carry the session's credential on a model request. */
const CREDENTIAL_HEADERS = new Set(["authorization", "x-api-key"]);

/** True for an Anthropic host, where the account credential belongs. */
export const isAnthropicHost = (url: string): boolean => {
	try {
		const host = new URL(url).hostname.toLowerCase();
		return (
			host === "anthropic.com" ||
			host.endsWith(".anthropic.com") ||
			host === "claude.ai" ||
			host.endsWith(".claude.ai")
		);
	} catch {
		// A URL that does not parse is no Anthropic host, so it gets no credential.
		return false;
	}
};

/** The headers less each one that carries a credential. */
export const withoutCredential = (
	headers: Readonly<Record<string, string>>
): Record<string, string> =>
	Object.fromEntries(
		Object.entries(headers).filter(
			([name]) => !CREDENTIAL_HEADERS.has(name.toLowerCase())
		)
	);

/** A model request as the engine sends it: its URL and init. */
export interface ModelRequest {
	url: string;
	init?: HttpInit;
}

/** True when the request would carry the session's credential to a host other than Anthropic's. */
export const leavesAnthropic = (request: ModelRequest): boolean =>
	request.init?.headers !== undefined && !isAnthropicHost(request.url);

/** The request with its credential headers dropped. */
export const withoutLogin = (request: ModelRequest): ModelRequest => ({
	...request,
	init: {
		...request.init,
		headers: withoutCredential(request.init?.headers ?? {})
	}
});

/**
 * Keeps the account login off a model request sent to another host (RISK-405).
 * With `ANTHROPIC_BASE_URL` set and no `ANTHROPIC_AUTH_TOKEN`, Claude Code
 * 2.1.329 sends the claude.ai login token to that URL. `$.session.authorize()`
 * answers a handle only for that login (null for `ANTHROPIC_AUTH_TOKEN`,
 * `ANTHROPIC_API_KEY` or `apiKeyHelper`), so a credential the person set for the
 * gateway still goes with the request.
 */
export const registerBaseUrl = (on: On): void => {
	on("http.fetch", async ($, e, next) =>
		next.origin.plugin === "engine" &&
		leavesAnthropic(e) &&
		(await $.session.authorize()) !== null
			? next(withoutLogin(e))
			: next(e)
	).catch((_$, e, next) => {
		if (next.called) {
			return next(e);
		}
		// The login check failed, so a request leaving Anthropic goes without a credential.
		return next(
			next.origin.plugin === "engine" && leavesAnthropic(e)
				? withoutLogin(e)
				: e
		);
	});
};
