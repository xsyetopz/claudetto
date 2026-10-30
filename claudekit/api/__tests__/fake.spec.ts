import { describe, expect, test } from "bun:test";
import { startFakeApi } from "../fake.ts";

describe("the fake Messages API", () => {
	test("keeps the body of a messages request and ends the turn", async () => {
		const api = startFakeApi();
		const body = JSON.stringify({ model: "m", stream: true, messages: [] });

		const answer = await fetch(`${api.url}/v1/messages`, {
			method: "POST",
			body,
		});
		const stream = await answer.text();
		await api.stop();

		expect(api.url.startsWith("http://127.0.0.1:")).toBe(true);
		expect(api.bodies).toEqual([body]);
		expect(api.others).toEqual([]);
		expect(stream).toContain("event: message_stop");
		expect(stream).toContain('"stop_reason":"end_turn"');
	});

	test("answers with the given text, streamed or not", async () => {
		const api = startFakeApi(undefined, "<block>yes</block>");
		const post = async (stream: boolean): Promise<string> =>
			(
				await fetch(`${api.url}/v1/messages`, {
					method: "POST",
					body: JSON.stringify({ stream }),
				})
			).text();

		const streamed = await post(true);
		const whole = await post(false);
		await api.stop();

		expect(streamed).toContain(JSON.stringify("<block>yes</block>"));
		expect(whole).toContain(JSON.stringify("<block>yes</block>"));
	});

	test("answers the first request that carries tools with the given tool call, and the next one with text", async () => {
		const api = startFakeApi({ name: "Bash", input: { command: "touch x" } });
		const body = JSON.stringify({ stream: true, tools: [{ name: "Bash" }] });
		const post = async (): Promise<string> =>
			(await fetch(`${api.url}/v1/messages`, { method: "POST", body })).text();

		const first = await post();
		const second = await post();
		await api.stop();

		expect(first).toContain('"type":"tool_use"');
		expect(first).toContain('"name":"Bash"');
		expect(first).toContain(
			JSON.stringify(JSON.stringify({ command: "touch x" })),
		);
		expect(first).toContain('"stop_reason":"tool_use"');
		expect(second).toContain('"stop_reason":"end_turn"');
	});

	test("answers a request that does not stream with one JSON message", async () => {
		const api = startFakeApi();

		const answer = await fetch(`${api.url}/v1/messages`, {
			method: "POST",
			body: JSON.stringify({ messages: [] }),
		});
		const message: unknown = await answer.json();
		await api.stop();

		expect(message).toMatchObject({
			type: "message",
			content: [{ type: "text", text: "ok" }],
			stop_reason: "end_turn",
		});
	});

	test("answers another route with an empty object and records it apart", async () => {
		const api = startFakeApi();

		const answer = await fetch(`${api.url}/v1/models`);
		const text = await answer.text();
		await api.stop();

		expect(text).toBe("{}");
		expect(api.bodies).toEqual([]);
		expect(api.others).toEqual(["GET /v1/models"]);
	});
});
