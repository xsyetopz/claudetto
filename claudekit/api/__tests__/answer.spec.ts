import { describe, expect, test } from "bun:test";
import {
	ANSWER,
	emptyReply,
	emptyStream,
	JSON_ANSWER,
	noTokens,
	textStream,
	toolAnswer,
	toolMessage,
} from "../answer.ts";
import { sse, streamOf } from "../sse.ts";

const eventsOf = (text: string): string[] =>
	text
		.split("\n")
		.filter((line) => line.startsWith("event: "))
		.map((line) => line.slice(7));

describe("the shared SSE builder", () => {
	test("frames an event as `event:` and `data:` lines and a blank line", () => {
		expect(sse("ping", { a: 1 })).toBe('event: ping\ndata: {"a":1}\n\n');
	});

	test("emits a delta event only when the parts hold a delta", () => {
		const parts = {
			message: {},
			block: {},
			stop: { stop_reason: "end_turn" },
			outputTokens: 0,
		};

		expect(eventsOf(streamOf(parts))).not.toContain("content_block_delta");
		expect(eventsOf(streamOf({ ...parts, delta: { text: "a" } }))).toContain(
			"content_block_delta",
		);
	});
});

describe("the answer builders", () => {
	test("`ANSWER` is a text stream of `ok` that ends the turn", () => {
		expect(ANSWER).toBe(textStream("ok"));
		expect(ANSWER).toContain('"text":"ok"');
		expect(ANSWER).toContain('"stop_reason":"end_turn"');
		expect(eventsOf(ANSWER).at(-1)).toBe("message_stop");
	});

	test("`JSON_ANSWER` is one message of `ok`", () => {
		expect(JSON.parse(JSON_ANSWER)).toMatchObject({
			type: "message",
			content: [{ type: "text", text: "ok" }],
			stop_reason: "end_turn",
		});
	});

	test("`toolAnswer` streams the input as one JSON delta under the given id", () => {
		const text = toolAnswer({ name: "Bash", input: { a: 1 } }, "toolu_x");

		expect(text).toContain('"id":"toolu_x"');
		expect(text).toContain(JSON.stringify(JSON.stringify({ a: 1 })));
		expect(text).toContain('"stop_reason":"tool_use"');
	});

	test("`toolMessage` holds the same call as a JSON message", () => {
		const message = toolMessage({ name: "Bash", input: { a: 1 } });

		expect(JSON.parse(message)).toMatchObject({
			content: [{ type: "tool_use", name: "Bash", input: { a: 1 } }],
			stop_reason: "tool_use",
		});
	});

	test("an empty stream has no delta and claims the tokens of its stamp", () => {
		const text = emptyStream(noTokens("m", "x"));

		expect(eventsOf(text)).not.toContain("content_block_delta");
		expect(text).toContain('"cache_read_input_tokens":0');
	});

	test("`emptyReply` answers an unparsable body as a stream", async () => {
		const reply = emptyReply("not json", {
			id: "m",
			requestId: "r",
			model: "fallback",
		});

		expect(reply.headers.get("content-type")).toBe("text/event-stream");
		expect(reply.headers.get("anthropic-request-id")).toBe("r");
		expect(await reply.text()).toContain('"model":"fallback"');
	});
});
