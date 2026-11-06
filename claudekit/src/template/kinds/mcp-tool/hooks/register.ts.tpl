import type { On } from "claude-code";

const TOOL = {
	name: {{json tool}},
	description: {{json description}},
	inputSchema: { type: "object", properties: { text: { type: "string" } }, required: ["text"] },
};

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
	on("tool.call", { tool: ["mcp__{{plugin}}__{{tool}}"] }, async () => ({ result: {{json answer}} }));
};
