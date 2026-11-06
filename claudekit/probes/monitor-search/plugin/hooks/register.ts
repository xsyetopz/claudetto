import type { On, ToolResultOf } from "claude-code";

// The recorded wrapper's spec, word for word: the record's byte counts depend on it.
const TOOL = {
	name: "monitor",
	isDeferred: true,
	description: [
		"Runs a command, or opens a WebSocket, in the background; each stdout line or text frame is an event that reaches you as a notification while you work. An event is not the user's reply.",
		"For one notice when something ends, use Bash run_in_background instead.",
		"Print only lines you act on (grep --line-buffered -E 'ready|FAIL|Error'), flush each pipe stage, merge 2>&1.",
		"timeout_ms defaults to 300000, max 600000; too many events stop it; TaskStop ends it.",
	].join(" "),
	inputSchema: {
		type: "object",
		properties: {
			command: { type: "string" },
			ws: {
				type: "object",
				properties: { url: { type: "string" }, protocols: { type: "array", items: { type: "string" } } },
				required: ["url"],
			},
			description: { type: "string", description: "Names each notification." },
			timeout_ms: { type: "number" },
		},
		required: ["description"],
	},
};
const WRAPPER = "mcp__claudetto__monitor";

// `$.tool.register` rejects until the session binds, so a refusal before `next` is retried after it.
export const register = (on: On): void => {
	on("session.start", async ($, e, next) => {
		const early = await $.tool.register(TOOL).then(
			() => true,
			() => false,
		);
		const started = await next(e);
		if (!early) {
			await $.tool.register(TOOL);
		}
		return started;
	});
	on("tool.call", { tool: [WRAPPER] }, async ($, e) => {
		// The wrapper's inputSchema above gives these types; the engine types an MCP tool's arguments as unknown.
		const input = { tool: "Monitor" as const, description: e.description as string, timeout_ms: (e.timeout_ms as number | undefined) ?? 300000 };
		const ws = e.ws as { url: string; protocols?: string[] } | undefined;
		const r = await $.tool.call(ws ? { ...input, ws } : { ...input, command: e.command as string });
		return { result: r?.text ?? JSON.stringify(r?.result ?? r) };
	});
	on("tool.describe", { tool: ["Monitor"] }, async (_$, e, next) => ({ ...(await next(e)), isDeferred: true }));
	on("tool.call", { tool: ["ToolSearch"] }, async ($, e, next) => {
		const r = await next(e);
		const result = r.result as ToolResultOf<"ToolSearch"> | undefined;
		const matches = result?.matches;
		if ((await $.env.get("MONITOR_SEARCH")) !== "rewrite" || !Array.isArray(matches) || !matches.includes("Monitor")) {
			return r;
		}
		return { result: { ...result, matches: [...new Set(matches.map((n: string) => (n === "Monitor" ? WRAPPER : n)))] } };
	});
};
