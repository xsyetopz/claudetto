// A local fake Messages API, so that a capture run costs nothing and reaches no provider.
// It listens on the loopback address, keeps every request body it is sent, and answers each one
// with a short stream that ends the turn. The method is the one `docs/surfaces.md` records under
// "The Probe, Kept Verbatim"; this is the new tree's own implementation of it, in one process
// with the tool rather than a second server to start by hand.

import { serve } from "bun";

/** One line of a server-sent-event stream. */
const sse = (event: string, data: unknown): string =>
	`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

/** The whole answer to a `POST /v1/messages`: a one-word reply that ends the turn. */
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

/** A running fake API server and what it has recorded, so a run can be read without any network call. */
export interface FakeApi {
	/** The loopback URL to give Claude Code as `ANTHROPIC_BASE_URL`. */
	readonly url: string;
	/** The raw body of each `POST` to the messages route, in the order they arrived. */
	readonly bodies: string[];
	/** The requests to any other route, which a reading must not depend on. */
	readonly others: string[];
	stop: () => Promise<void>;
}

/** Starts the fake API on a free loopback port. */
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
