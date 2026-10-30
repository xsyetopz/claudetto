import { parsedOf } from "./json.ts";
import { streamOf } from "./sse.ts";

/** What identifies a fake answer to the reader: its message id, its model, and the token counts it claims. */
export interface Stamp {
	readonly id: string;
	readonly model: string;
	readonly usage: Record<string, number>;
}

/** The stamp of the capture fake, whose counts are small but not zero so a reading can tell it from a stub. */
export const FAKE: Stamp = {
	id: "msg_fake",
	model: "claude-sonnet-5-5",
	usage: { input_tokens: 1, output_tokens: 1 },
};

/** The stamp of an answer that says it cost nothing. */
export const noTokens = (id: string, model: string): Stamp => ({
	id,
	model,
	usage: {
		input_tokens: 0,
		output_tokens: 0,
		cache_creation_input_tokens: 0,
		cache_read_input_tokens: 0,
	},
});

const messageOf = (
	stamp: Stamp,
	content: readonly unknown[],
	stop: string | null,
): Record<string, unknown> => ({
	id: stamp.id,
	type: "message",
	role: "assistant",
	model: stamp.model,
	content,
	stop_reason: stop,
	stop_sequence: null,
	usage: stamp.usage,
});

const outputOf = (stamp: Stamp): number => stamp.usage["output_tokens"] ?? 0;

const stopOf = (reason: string): Record<string, unknown> => ({
	stop_reason: reason,
	stop_sequence: null,
});

/** A streamed answer of `text` that ends the turn. */
export const textStream = (text: string, stamp: Stamp = FAKE): string =>
	streamOf({
		message: messageOf(stamp, [], null),
		block: { type: "text", text: "" },
		delta: { type: "text_delta", text },
		stop: stopOf("end_turn"),
		outputTokens: outputOf(stamp),
	});

/** The same answer for a request that does not stream, as a JSON body. */
export const textMessage = (text: string, stamp: Stamp = FAKE): string =>
	JSON.stringify(messageOf(stamp, [{ type: "text", text }], "end_turn"));

/** A streamed answer with no text at all, so a caller that shows the text has nothing to show. */
export const emptyStream = (stamp: Stamp): string =>
	streamOf({
		message: messageOf(stamp, [], null),
		block: { type: "text", text: "" },
		stop: stopOf("end_turn"),
		outputTokens: outputOf(stamp),
	});

/** The empty answer for a request that does not stream. */
export const emptyMessage = (stamp: Stamp): string => textMessage("", stamp);

/** The answer to every request that does not stream or carry tools, as the capture fake gives it. */
export const ANSWER = textStream("ok");

/** The same answer for a request that does not stream. */
export const JSON_ANSWER = textMessage("ok");

/** A tool call to make: the tool's name and the input it is called with. */
export interface ToolCall {
	readonly name: string;
	readonly input: Record<string, unknown>;
}

/** A streamed answer that makes `call` under the tool use id `id`. */
export const toolAnswer = (
	call: ToolCall,
	id = "toolu_fake",
	stamp: Stamp = FAKE,
): string =>
	streamOf({
		message: messageOf(stamp, [], null),
		block: { type: "tool_use", id, name: call.name, input: {} },
		delta: {
			type: "input_json_delta",
			partial_json: JSON.stringify(call.input),
		},
		stop: stopOf("tool_use"),
		outputTokens: outputOf(stamp),
	});

/** The same tool call for a request that does not stream. */
export const toolMessage = (
	call: ToolCall,
	id = "toolu_fake",
	stamp: Stamp = FAKE,
): string =>
	JSON.stringify(
		messageOf(
			stamp,
			[{ type: "tool_use", id, name: call.name, input: call.input }],
			"tool_use",
		),
	);

/** A `text/event-stream` answer; `headers` are added to the content type. */
export const streamResponse = (
	body: string,
	headers: Record<string, string> = {},
): Response =>
	new Response(body, {
		status: 200,
		headers: { ...headers, "content-type": "text/event-stream" },
	});

/** An `application/json` answer; `headers` are added to the content type. */
export const jsonResponse = (
	body: string,
	headers: Record<string, string> = {},
): Response =>
	new Response(body, {
		status: 200,
		headers: { ...headers, "content-type": "application/json" },
	});

/** How an empty answer names itself, and the model it falls back on when the request names none. */
export interface EmptyReply {
	readonly id: string;
	readonly requestId: string;
	readonly model: string;
}

const isJson = (raw: string): boolean => {
	try {
		JSON.parse(raw);
		return true;
	} catch {
		return false;
	}
};

/**
 * An empty answer in the shape the request asked for, with the model it named.
 * A body that does not parse is answered as a stream, since that is the shape that cannot be mistaken for a verdict.
 */
export const emptyReply = (raw: string, who: EmptyReply): Response => {
	const body = parsedOf(raw);
	const named = body["model"];
	const stamp = noTokens(who.id, typeof named === "string" ? named : who.model);
	const headers = { "anthropic-request-id": who.requestId };
	if (!isJson(raw) || body["stream"] === true) {
		return streamResponse(emptyStream(stamp), headers);
	}
	return jsonResponse(emptyMessage(stamp), headers);
};
