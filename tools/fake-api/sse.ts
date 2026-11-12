import type { Usage } from "./usage.ts";

export type Reply =
	| { readonly text: string }
	| { readonly tool: string; readonly input: unknown };

const ev = (type: string, data: object): string =>
	`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`;

const blockEvents = (id: string, reply: Reply): string =>
	"text" in reply
		? ev("content_block_start", {
				index: 0,
				content_block: { type: "text", text: "" },
			}) +
			ev("content_block_delta", {
				index: 0,
				delta: { type: "text_delta", text: reply.text },
			})
		: ev("content_block_start", {
				index: 0,
				content_block: {
					type: "tool_use",
					id: `toolu_${id}`,
					name: reply.tool,
					input: {},
				},
			}) +
			ev("content_block_delta", {
				index: 0,
				delta: {
					type: "input_json_delta",
					partial_json: JSON.stringify(reply.input),
				},
			});

export const sse = (id: string, reply: Reply, usage: Usage): string => {
	const start = ev("message_start", {
		message: {
			id,
			type: "message",
			role: "assistant",
			model: "claude-opus-5-5",
			content: [],
			stop_reason: null,
			usage: { ...usage, output_tokens: 1 },
		},
	});
	return (
		start +
		blockEvents(id, reply) +
		ev("content_block_stop", { index: 0 }) +
		ev("message_delta", {
			delta: { stop_reason: "text" in reply ? "end_turn" : "tool_use" },
			usage: { output_tokens: 5 },
		}) +
		ev("message_stop", {})
	);
};
