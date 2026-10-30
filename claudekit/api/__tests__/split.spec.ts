import { afterEach, describe, expect, test } from "bun:test";
import { serve } from "bun";
import { type SplitApi, startSplitApi } from "../split.ts";

const stops: (() => unknown)[] = [];

afterEach(async () => {
	await Promise.all(stops.splice(0).map((stop) => stop()));
});

interface Seen {
	readonly auth: string | null;
	readonly body: string;
}

const upstreamOf = (seen: Seen[], status = 200): string => {
	const server = serve({
		hostname: "127.0.0.1",
		port: 0,
		fetch: async (request) => {
			seen.push({
				auth: request.headers.get("authorization"),
				body: await request.text(),
			});
			return Response.json(
				{
					content: [{ type: "text", text: "<block>no</block>" }],
					usage: { input_tokens: 7, output_tokens: 3 },
				},
				{ status },
			);
		},
	});
	stops.push(() => server.stop(true));
	return `http://127.0.0.1:${server.port}`;
};

const splitOf = (upstream: string): SplitApi => {
	const api = startSplitApi({
		upstream,
		picks: (body) =>
			typeof body === "object" &&
			body !== null &&
			Reflect.get(body, "model") === "picked",
		answer: () => Response.json({ local: true }),
	});
	stops.push(api.stop);
	return api;
};

const post = (api: SplitApi, body: object): Promise<Response> =>
	fetch(`${api.url}/v1/messages`, {
		method: "POST",
		headers: { authorization: "Bearer test-token" },
		body: JSON.stringify(body),
	});

describe("the split API", () => {
	test("answers an unpicked request itself, so the upstream never sees it", async () => {
		const seen: Seen[] = [];
		const api = splitOf(upstreamOf(seen));
		const reply = await post(api, { model: "agent", max_tokens: 5 });
		expect(await reply.json()).toEqual({ local: true });
		expect(seen).toEqual([]);
		expect(api.local()).toBe(1);
		expect(api.forwarded).toEqual([]);
	});

	test("forwards a picked request with its bearer and records the reply and its tokens", async () => {
		const seen: Seen[] = [];
		const api = splitOf(upstreamOf(seen));
		const reply = await post(api, { model: "picked", max_tokens: 64 });
		expect(reply.status).toBe(200);
		expect(seen.map((one) => one.auth)).toEqual(["Bearer test-token"]);
		expect(api.forwarded).toEqual([
			expect.objectContaining({
				model: "picked",
				maxTokens: 64,
				status: 200,
				usage: { input_tokens: 7, output_tokens: 3 },
			}),
		]);
		expect(api.forwarded[0]?.reply).toContain("<block>no</block>");
	});

	test("keeps an upstream error status, so a caller can tell it from a verdict", async () => {
		const api = splitOf(upstreamOf([], 529));
		expect((await post(api, { model: "picked" })).status).toBe(529);
		expect(api.forwarded[0]?.status).toBe(529);
	});

	test("answers 502 and records status 0 when the upstream cannot be reached", async () => {
		const api = splitOf("http://127.0.0.1:9");
		expect((await post(api, { model: "picked" })).status).toBe(502);
		expect(api.forwarded[0]?.status).toBe(0);
	});
});
