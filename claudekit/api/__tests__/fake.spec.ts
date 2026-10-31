import { describe, expect, test } from "bun:test";
import { type FakeApi, startFakeApi } from "../fake.ts";

const postTo = async (api: FakeApi, body: unknown): Promise<string> =>
	(
		await fetch(`${api.url}/v1/messages`, {
			method: "POST",
			body: JSON.stringify(body),
		})
	).text();

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
		const post = (): Promise<string> =>
			postTo(api, { stream: true, tools: [{ name: "Bash" }] });

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

	test("answers each request that carries tools with the next of the given calls, then with text", async () => {
		const api = startFakeApi([
			{ name: "Agent", input: { prompt: "p" } },
			{ name: "Read", input: { file_path: "/f" } },
		]);
		const post = (): Promise<string> =>
			postTo(api, { stream: true, tools: [{ name: "Read" }] });

		const first = await post();
		const second = await post();
		const third = await post();
		await api.stop();

		expect(first).toContain('"name":"Agent"');
		expect(second).toContain('"name":"Read"');
		expect(third).toContain('"stop_reason":"end_turn"');
	});

	test("stamps every answer with the given model and token counts", async () => {
		const stamp = {
			id: "msg_stamp",
			model: "claude-haiku-5-5",
			usage: { input_tokens: 7, output_tokens: 3 },
		};
		const api = startFakeApi({ name: "Bash", input: {} }, "ok", stamp);
		const post = (body: unknown): Promise<string> => postTo(api, body);

		const call = await post({ stream: true, tools: [{ name: "Bash" }] });
		const text = await post({ stream: true });
		const whole = await post({});
		await api.stop();

		for (const answer of [call, text, whole]) {
			expect(answer).toContain('"model":"claude-haiku-5-5"');
			expect(answer).toContain('"input_tokens":7');
		}
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
