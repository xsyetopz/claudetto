// The answer the proxy gives in place of the API when it holds a summarizer request back, and the
// test that tells such a request apart from the session's own.
//
// `2.1.312` builds the summary request in `Mu`, which calls the API with
// `querySource: "agent_summary"` and `cacheSafeParams.forkContextMessages` set to the agent's whole
// context, so the request carries that context at the cache-read price every `refreshSeconds` (30
// by default, `chunk-1wgxyh0t.js:122662`). `skipTranscript: !0` keeps it out of
// `~/.claude/projects/*/*.jsonl`, so no transcript-derived figure can see it, and the request body
// is the one surface that both modes of the summarizer share.

import { objectOf, parsedOf } from "./json.ts";

/** The prompts of the two summarizer modes, each in the body of its own request. */
export const MARKERS = [
	// `full` mode, the user message that `Li(previousSummary)` builds.
	"3-5 words using present tense",
	// `short` mode, the system prompt `Su` that `vu` sends.
	"3-5 word progress label for a background agent",
] as const;

/**
 * Whether `body` is a request of the summarizer and not of the session or an agent.
 *
 * This matches on text, which the user accepted, so a reworded prompt silently lets the summarizer
 * through again. The `sent` and `stopped` counts of a round are what show whether it still matches:
 * when both stay 0 in a session whose debug log has `Forking for summary`, the markers need
 * checking against the installed version.
 */
export const isSummary = (body: string): boolean =>
	MARKERS.some((marker) => body.includes(marker));

const NO_TOKENS = {
	input_tokens: 0,
	output_tokens: 0,
	cache_creation_input_tokens: 0,
	cache_read_input_tokens: 0,
};

const ID = "msg_claudetto_summary_stub";

/** An empty answer, so no label is shown and `Ni` has nothing to accept, in the streaming shape. */
const emptyStream = (model: string): string =>
	(
		[
			[
				"message_start",
				{
					type: "message_start",
					message: {
						id: ID,
						type: "message",
						role: "assistant",
						model,
						content: [],
						stop_reason: null,
						stop_sequence: null,
						usage: NO_TOKENS,
					},
				},
			],
			[
				"content_block_start",
				{
					type: "content_block_start",
					index: 0,
					content_block: { type: "text", text: "" },
				},
			],
			["content_block_stop", { type: "content_block_stop", index: 0 }],
			[
				"message_delta",
				{
					type: "message_delta",
					delta: { stop_reason: "end_turn", stop_sequence: null },
					usage: { output_tokens: 0 },
				},
			],
			["message_stop", { type: "message_stop" }],
		] as const
	)
		.map(
			([event, data]) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
		)
		.join("");

const emptyMessage = (model: string): unknown => ({
	id: ID,
	type: "message",
	role: "assistant",
	model,
	content: [{ type: "text", text: "" }],
	stop_reason: "end_turn",
	stop_sequence: null,
	usage: NO_TOKENS,
});

const modelOf = (body: string): string => {
	const model = parsedOf(body)["model"];
	return typeof model === "string" ? model : "claude-haiku-5-5";
};

const asksStream = (body: string): boolean => {
	try {
		return objectOf(JSON.parse(body))["stream"] === true;
	} catch {
		// A body that does not parse still matched a marker, so answer in the streaming shape.
		return true;
	}
};

/** The answer in place of the API, streaming or not, in the shape the request asked for. */
export const answer = (body: string): Response => {
	const model = modelOf(body);
	const headers = { "anthropic-request-id": "req_claudetto_summary_stub" };
	if (asksStream(body)) {
		return new Response(emptyStream(model), {
			status: 200,
			headers: { ...headers, "content-type": "text/event-stream" },
		});
	}
	return new Response(JSON.stringify(emptyMessage(model)), {
		status: 200,
		headers: { ...headers, "content-type": "application/json" },
	});
};
