// Monitor losses (2) and (3) probe: monitor wraps the stock Monitor through $.tool.call, so stock code
// delivers each event (its frame, ws source, rate stop). The stock tool stays deferred and refuses the
// model's own call, as the ask Mod does for AskUserQuestion.
const spec = {
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
				properties: {
					url: { type: "string" },
					protocols: { type: "array", items: { type: "string" } },
				},
				required: ["url"],
			},
			description: { type: "string", description: "Names each notification." },
			timeout_ms: { type: "number" },
		},
		required: ["description"],
	},
};
const LOG = "/tmp/probe-mon8/log.json";
const log = [];
const note = async ($, x) => {
	log.push(x);
	await $.fs.write(LOG, JSON.stringify(log, null, 1));
};
let wrapping = 0;
export function register(on) {
	on("session.start", async ($, e, next) => {
		const r = await next(e);
		await $.tool
			.register(spec)
			.catch((err) => note($, { regErr: String(err) }));
		return r;
	});
	on("tool.call", { tool: "mcp__claudetto__monitor" }, async ($, e) => {
		const input = {
			tool: "Monitor",
			description: e.description,
			timeout_ms: e.timeout_ms ?? 300000,
		};
		if (e.ws) input.ws = e.ws;
		else input.command = e.command;
		wrapping++;
		try {
			const r = await $.tool.call(input);
			await note($, { stock: r });
			return { result: r?.text ?? JSON.stringify(r?.result ?? r) };
		} catch (err) {
			await note($, { err: String(err) });
			return { result: `monitor failed: ${err?.message ?? err}` };
		} finally {
			wrapping--;
		}
	});
	on("tool.call", { tool: "Monitor" }, async ($, e, next) => {
		await note($, { guard: wrapping ? "pass" : "deny" });
		return wrapping
			? next(e)
			: { deny: "Monitor is off here: call mcp__claudetto__monitor." };
	});
	on("tool.describe", { tool: "Monitor" }, async ($, e, next) => ({
		...(await next(e)),
		isDeferred: true,
	}));
	on("tool.call", { tool: "ToolSearch" }, async ($, e, next) => {
		const r = await next(e);
		await note($, { toolSearch: r });
		const m = r.result?.matches;
		if (!Array.isArray(m) || !m.includes("Monitor")) return r;
		const matches = [
			...new Set(
				m.map((n) => (n === "Monitor" ? "mcp__claudetto__monitor" : n)),
			),
		];
		return { result: { ...r.result, matches } };
	});
}
