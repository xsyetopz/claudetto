import { serve } from "bun";

const sse = (event: string, data: unknown): string =>
	`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

const ANSWER = [
	sse("message_start", {
		type: "message_start",
		message: {
			id: "msg_fake",
			type: "message",
			role: "assistant",
			model: "claude-sonnet-5-5",
			content: [],
			stop_reason: null,
			usage: { input_tokens: 1, output_tokens: 1 },
		},
	}),
	sse("content_block_start", {
		type: "content_block_start",
		index: 0,
		content_block: { type: "text", text: "" },
	}),
	sse("content_block_delta", {
		type: "content_block_delta",
		index: 0,
		delta: { type: "text_delta", text: "ok" },
	}),
	sse("content_block_stop", { type: "content_block_stop", index: 0 }),
	sse("message_delta", {
		type: "message_delta",
		delta: { stop_reason: "end_turn" },
		usage: { output_tokens: 1 },
	}),
	sse("message_stop", { type: "message_stop" }),
].join("");

export interface FakeApi {
	readonly url: string;
	readonly bodies: string[];
	/** The requests to any other route, which a reading must not depend on. */
	readonly others: string[];
	stop: () => Promise<void>;
}

export const startFakeApi = (): FakeApi => {
	const bodies: string[] = [];
	const others: string[] = [];
	const server = serve({
		hostname: "127.0.0.1",
		port: 0,
		fetch: async (request) => {
			const { pathname } = new URL(request.url);
			if (pathname.endsWith("/messages") && request.method === "POST") {
				bodies.push(await request.text());
				return new Response(ANSWER, {
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
