import { objectOf, parsedOf } from "./json.ts";

export const MARKERS = [
	"3-5 words using present tense",
	"3-5 word progress label for a background agent",
] as const;

/** Matches on text, so a reworded prompt silently lets the summarizer through again. */
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
