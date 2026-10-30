import { describe, expect, test } from "bun:test";
import { objectOf } from "../json.ts";
import { answer, isSummary } from "../stub.ts";

/** A request body of the summarizer in `full` mode, which carries the prompt that `Li` builds. */
const full = JSON.stringify({
	model: "claude-haiku-5-5",
	stream: true,
	messages: [
		{
			role: "user",
			content:
				"Describe your most recent action in 3-5 words using present tense (-ing). Name the file or function, not the branch.",
		},
	],
});

/** A `short` mode body, which carries the other prompt and asks for no stream. */
const short = JSON.stringify({
	model: "claude-haiku-5-5",
	stream: false,
	system:
		"You write a 3-5 word progress label for a background agent, from short notes about what it is doing.",
});

/** A body of the session itself, which must reach the API untouched. */
const ordinary = JSON.stringify({
	model: "claude-haiku-5-5",
	stream: true,
	messages: [{ role: "user", content: "Add a test for the parser." }],
});

describe("isSummary", () => {
	test("holds for each of the two summarizer modes", () => {
		expect(isSummary(full)).toBe(true);
		expect(isSummary(short)).toBe(true);
	});

	test("does not hold for a request of the session", () => {
		expect(isSummary(ordinary)).toBe(false);
	});
});

describe("answer", () => {
	test("gives a stream when the request asked to stream, with no text to show", async () => {
		const reply = answer(full);

		expect(reply.status).toBe(200);
		expect(reply.headers.get("content-type")).toBe("text/event-stream");
		const body = await reply.text();
		expect(body).toContain("message_start");
		expect(body).toContain("message_stop");
	});

	test("gives one message when the request asked for no stream", async () => {
		const reply = answer(short);

		expect(reply.headers.get("content-type")).toBe("application/json");
		const body = objectOf(await reply.json());
		expect(body["type"]).toBe("message");
		expect(JSON.stringify(body["content"])).toBe('[{"type":"text","text":""}]');
		expect(objectOf(body["usage"])["cache_read_input_tokens"]).toBe(0);
	});

	test("keeps the model the request asked for, so the session reads back what it sent", async () => {
		const reply = answer(JSON.stringify({ model: "claude-opus-5-5" }));

		expect(objectOf(await reply.json())["model"]).toBe("claude-opus-5-5");
	});
});
