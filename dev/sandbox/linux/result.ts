// The pure parts of `just sandbox-linux`: the life of the login, and the verdict from the files of the container.

/** The minutes until the access token of `credentials` (the JSON of `.credentials.json`) expires, or `undefined` when it has no expiry. */
export const tokenMinutes = (
	credentials: string,
	now: number,
): number | undefined => {
	const parsed: { claudeAiOauth?: { expiresAt?: number } } =
		JSON.parse(credentials);
	const expires = parsed.claudeAiOauth?.expiresAt;
	return typeof expires === "number"
		? Math.floor((expires - now) / 60_000)
		: undefined;
};

/** What the session gave: the `Bash` commands, their results, and the `result` message. */
export interface Session {
	commands: string[];
	results: string[];
	cost?: number;
	subtype?: string;
}

/** The text of a `tool_result` content, which is a string or a list of text blocks. */
const text = (content: unknown): string => {
	if (typeof content === "string") {
		return content;
	}
	return Array.isArray(content)
		? content.map((b: { text?: string }) => b.text ?? "").join("")
		: "";
};

/** The session from the `stream-json` lines of `claude -p`. */
export const parseSession = (jsonl: string): Session => {
	const session: Session = { commands: [], results: [] };
	for (const line of jsonl.split("\n").filter((l) => l.startsWith("{"))) {
		const m = JSON.parse(line);
		for (const b of m.message?.content ?? []) {
			if (b.type === "tool_use" && b.name === "Bash") {
				session.commands.push(String(b.input?.command));
			}
			if (b.type === "tool_result") {
				session.results.push(text(b.content));
			}
		}
		if (m.type === "result") {
			session.cost = m.total_cost_usd;
			session.subtype = m.subtype;
		}
	}
	return session;
};

/** The reply of the fake agent. */
export const PONG = "pong";

/**
 * The verdict: `blocked` when the control reached the socket and the sandboxed call did not,
 * `reached` when the sandboxed call reached it, and `unknown` in each other case.
 */
export const verdict = (
	control: string,
	session: Session,
): "blocked" | "reached" | "unknown" => {
	if (!control.includes(PONG) || session.results.length === 0) {
		return "unknown";
	}
	return session.results.some((r) => r.includes(PONG)) ? "reached" : "blocked";
};
