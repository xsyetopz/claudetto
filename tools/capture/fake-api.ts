import { serve } from "bun";

const sse = (event: string, data: unknown): string =>
	`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

const MESSAGE = {
	id: "msg_fake",
	type: "message",
	role: "assistant",
	model: "claude-sonnet-5-5",
	content: [],
	stop_reason: null,
	usage: { input_tokens: 1, output_tokens: 1 },
};

const streamOf = (
	block: Record<string, unknown>,
	delta: Record<string, unknown>,
	stop: string,
): string =>
	[
		sse("message_start", { type: "message_start", message: MESSAGE }),
		sse("content_block_start", {
			type: "content_block_start",
			index: 0,
			content_block: block,
		}),
		sse("content_block_delta", {
			type: "content_block_delta",
			index: 0,
			delta,
		}),
		sse("content_block_stop", { type: "content_block_stop", index: 0 }),
		sse("message_delta", {
			type: "message_delta",
			delta: { stop_reason: stop },
			usage: { output_tokens: 1 },
		}),
		sse("message_stop", { type: "message_stop" }),
	].join("");

const ANSWER = streamOf(
	{ type: "text", text: "" },
	{ type: "text_delta", text: "ok" },
	"end_turn",
);

const JSON_ANSWER = JSON.stringify({
	...MESSAGE,
	content: [{ type: "text", text: "ok" }],
	stop_reason: "end_turn",
});

export interface ToolCall {
	readonly name: string;
	readonly input: Record<string, unknown>;
}

const toolAnswer = (call: ToolCall): string =>
	streamOf(
		{ type: "tool_use", id: "toolu_fake", name: call.name, input: {} },
		{ type: "input_json_delta", partial_json: JSON.stringify(call.input) },
		"tool_use",
	);

export interface FakeApi {
	readonly url: string;
	readonly bodies: string[];
	/** The requests to any other route, which a reading must not depend on. */
	readonly others: string[];
	stop: () => Promise<void>;
}

const carriesTools = (body: unknown): boolean =>
	typeof body === "object" &&
	body !== null &&
	Array.isArray(Reflect.get(body, "tools")) &&
	Reflect.get(body, "tools").length > 0;

const streams = (body: unknown): boolean =>
	typeof body === "object" &&
	body !== null &&
	Reflect.get(body, "stream") === true;

/** With `call`, the first request that carries tools is answered with that tool call, once. */
export const startFakeApi = (call?: ToolCall): FakeApi => {
	const bodies: string[] = [];
	const others: string[] = [];
	let pending = call;
	const server = serve({
		hostname: "127.0.0.1",
		port: 0,
		fetch: async (request) => {
			const { pathname } = new URL(request.url);
			if (pathname.endsWith("/messages") && request.method === "POST") {
				const raw = await request.text();
				bodies.push(raw);
				const body: unknown = JSON.parse(raw);
				if (!streams(body)) {
					return new Response(JSON_ANSWER, {
						headers: { "content-type": "application/json" },
					});
				}
				let answer = ANSWER;
				if (pending !== undefined && carriesTools(body)) {
					answer = toolAnswer(pending);
					pending = undefined;
				}
				return new Response(answer, {
					headers: { "content-type": "text/event-stream" },
				});
			}
			others.push(`${request.method} ${pathname}`);
			return new Response("{}", {
				headers: { "content-type": "application/json" },
			});
		},
	});
	return {
		url: `http://127.0.0.1:${server.port}`,
		bodies,
		others,
		stop: () => server.stop(true),
	};
};
