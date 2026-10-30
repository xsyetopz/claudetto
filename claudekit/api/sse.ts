/** One server-sent event, framed the way the Messages API frames it. */
export const sse = (event: string, data: unknown): string =>
	`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

/** The parts of a one-block streamed answer; a missing `delta` leaves the block empty. */
export interface StreamParts {
	/** The `message` of the `message_start` event. */
	readonly message: Record<string, unknown>;
	readonly block: Record<string, unknown>;
	readonly delta?: Record<string, unknown>;
	/** The `delta` of the `message_delta` event, which names the stop reason. */
	readonly stop: Record<string, unknown>;
	readonly outputTokens: number;
}

/** The one SSE builder of the fakes: every streamed answer is a message with a single content block. */
export const streamOf = (parts: StreamParts): string =>
	[
		sse("message_start", { type: "message_start", message: parts.message }),
		sse("content_block_start", {
			type: "content_block_start",
			index: 0,
			content_block: parts.block,
		}),
		...(parts.delta === undefined
			? []
			: [
					sse("content_block_delta", {
						type: "content_block_delta",
						index: 0,
						delta: parts.delta,
					}),
				]),
		sse("content_block_stop", { type: "content_block_stop", index: 0 }),
		sse("message_delta", {
			type: "message_delta",
			delta: parts.stop,
			usage: { output_tokens: parts.outputTokens },
		}),
		sse("message_stop", { type: "message_stop" }),
	].join("");
