import { isRecord, toolsOf } from "./measure";

/** Marks the subagent's prompt, so the fake API can tell the subagent's request from the main loop's. */
export const SUBAGENT_MARKER = "SUBAGENT-MARKER-7f3a";

/** One recorded request. */
export interface Captured {
	readonly path: string;
	readonly body: Record<string, unknown>;
}

/** What the fake API says: one text block, or one tool_use block. */
export type Reply = { text: string } | { tool: string; input: unknown };

const sse = (events: readonly [string, unknown][]): string =>
	events
		.map(([name, data]) => `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`)
		.join("");

const blockStart = (reply: Reply): unknown =>
	"text" in reply
		? { type: "text", text: "" }
		: { type: "tool_use", id: "toolu_fake", name: reply.tool, input: {} };

const blockDelta = (reply: Reply): unknown =>
	"text" in reply
		? { type: "text_delta", text: reply.text }
		: { type: "input_json_delta", partial_json: JSON.stringify(reply.input) };

/**
 * A minimal valid streamed reply: one text block, or one tool_use block.
 *
 * @param reply The text, or the tool to call and its input.
 * @returns The server-sent-events body.
 */
export function streamedReply(reply: Reply): string {
	const message = {
		id: "msg_fake",
		type: "message",
		role: "assistant",
		model: "fake",
		content: [],
		stop_reason: null,
		usage: { input_tokens: 1, output_tokens: 1 }
	};
	return sse([
		["message_start", { type: "message_start", message }],
		[
			"content_block_start",
			{
				type: "content_block_start",
				index: 0,
				content_block: blockStart(reply)
			}
		],
		[
			"content_block_delta",
			{ type: "content_block_delta", index: 0, delta: blockDelta(reply) }
		],
		["content_block_stop", { type: "content_block_stop", index: 0 }],
		[
			"message_delta",
			{
				type: "message_delta",
				delta: {
					stop_reason: "text" in reply ? "end_turn" : "tool_use",
					stop_sequence: null
				},
				usage: { output_tokens: 1 }
			}
		],
		["message_stop", { type: "message_stop" }]
	]);
}

/**
 * Whether a value mentions a string anywhere in its JSON.
 *
 * @param value Any JSON-serializable value.
 * @param needle The text to look for.
 * @returns True when the serialized value contains it.
 */
export const mentions = (value: unknown, needle: string): boolean =>
	JSON.stringify(value).includes(needle);

/**
 * Whether a request is a subagent's first: its messages carry the marker but no tool_use block. The
 * main loop's follow-up request also carries the marker, inside the Agent tool_use it made.
 *
 * @param messages The `messages` field of a request body.
 * @returns True for the subagent's request.
 */
export const isSubagentRequest = (messages: unknown): boolean =>
	mentions(messages, SUBAGENT_MARKER) &&
	!mentions(messages, '"type":"tool_use"');

/** A running fake API. */
export interface FakeApi {
	readonly url: string;
	readonly requests: Captured[];
	readonly stop: () => Promise<void>;
}

/**
 * Starts the fake API. With `callAgent`, the first main-loop request that carries tools is answered
 * with an Agent tool_use whose prompt holds SUBAGENT_MARKER; every other request gets a short text.
 *
 * @param callAgent Whether the first main-loop reply calls the Agent tool.
 * @param agentType The `subagent_type` that call names.
 * @returns The base URL, the recorded requests and a stop function.
 */
export function startFakeApi(
	callAgent: boolean,
	agentType = "general-purpose"
): FakeApi {
	const requests: Captured[] = [];
	let called = false;
	const server = Bun.serve({
		port: 0,
		hostname: "127.0.0.1",
		async fetch(req) {
			const path = new URL(req.url).pathname;
			if (req.method !== "POST" || !path.startsWith("/v1/messages")) {
				return new Response("{}", {
					headers: { "content-type": "application/json" }
				});
			}
			const parsed: unknown = await req.json();
			const body = isRecord(parsed) ? parsed : {};
			requests.push({ path, body });
			const inSubagent = mentions(body["messages"], SUBAGENT_MARKER);
			let reply: Reply = { text: "ok" };
			if (callAgent && !called && toolsOf(body).length > 0 && !inSubagent) {
				called = true;
				reply = {
					tool: "Agent",
					input: {
						description: "probe",
						subagent_type: agentType,
						prompt: `${SUBAGENT_MARKER}: reply done.`
					}
				};
			}
			return new Response(streamedReply(reply), {
				headers: { "content-type": "text/event-stream" }
			});
		}
	});
	return {
		url: `http://127.0.0.1:${server.port}`,
		requests,
		stop: async () => {
			await server.stop(true);
		}
	};
}
