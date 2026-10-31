import { afterEach, describe, expect, test } from "bun:test";
import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { serve } from "bun";
import { type Row, rowsOf, seenIn } from "../../summary-cost/log.ts";
import { targetOf, usageIn } from "../forward.ts";
import { type Mode, start } from "../proxy.ts";

const summaryBody = JSON.stringify({
	model: "claude-haiku-5-5",
	stream: true,
	messages: [
		{
			role: "user",
			content:
				"Describe your most recent action in 3-5 words using present tense (-ing).",
		},
	],
});

const ordinaryBody = JSON.stringify({
	model: "claude-opus-5-5",
	stream: true,
	messages: [{ role: "user", content: "Add a test for the parser." }],
});

const TOKEN = "Bearer sk-fake-token-of-the-test";

const streamed = (cacheRead: number, input: number): string =>
	`event: message_start\ndata: ${JSON.stringify({
		type: "message_start",
		message: {
			usage: { input_tokens: input, cache_read_input_tokens: cacheRead },
		},
	})}\n\nevent: message_stop\ndata: {"type":"message_stop"}\n\n`;

interface Call {
	path: string;
	method: string;
	auth: string | null;
	body: string;
}

const spent: { stop: () => void }[] = [];
const logs: string[] = [];

afterEach(async () => {
	for (const one of spent.splice(0)) {
		one.stop();
	}
	await Promise.all(logs.splice(0).map((f) => rm(f, { force: true })));
});

const fakeApi = (calls: Call[], cacheRead = 1000, input = 10): string => {
	const server = serve({
		hostname: "127.0.0.1",
		port: 0,
		fetch: async (request) => {
			calls.push({
				path: new URL(request.url).pathname,
				method: request.method,
				auth: request.headers.get("authorization"),
				body: await request.text(),
			});
			return new Response(streamed(cacheRead, input), {
				headers: { "content-type": "text/event-stream" },
			});
		},
	});
	spent.push({ stop: () => void server.stop(true) });
	return `http://127.0.0.1:${server.port}`;
};

interface Started {
	url: string;
	log: string;
	stop: () => Promise<void>;
}

const proxyFor = (mode: Mode, upstream: string): Started => {
	const log = join(tmpdir(), `proxy-${process.pid}-${Math.random()}.jsonl`);
	logs.push(log);
	const proxy = start(mode, log, upstream);
	return { url: proxy.url, log, stop: proxy.stop };
};

const post = (url: string, body: string): Promise<Response> =>
	fetch(`${url}/v1/messages?beta=true`, {
		method: "POST",
		headers: { "content-type": "application/json", authorization: TOKEN },
		body,
	});

const rowsIn = async (log: string): Promise<Row[]> =>
	rowsOf(await readFile(log, "utf8"));

describe("targetOf", () => {
	test("keeps the path and the query and swaps in the API host", () => {
		expect(
			targetOf(
				"http://127.0.0.1:5173/v1/messages?beta=true",
				"https://api.anthropic.com",
			),
		).toBe("https://api.anthropic.com/v1/messages?beta=true");
	});
});

describe("usageIn", () => {
	test("reads the tokens of a streamed answer from its `message_start` event", () => {
		expect(usageIn(streamed(78_000, 120))?.cache_read_input_tokens).toBe(
			78_000,
		);
	});

	test("reads the tokens of an answer that is one JSON body", () => {
		expect(
			usageIn(JSON.stringify({ type: "message", usage: { input_tokens: 7 } }))
				?.input_tokens,
		).toBe(7);
	});

	test("gives nothing for a body that carries no tokens", () => {
		expect(usageIn("overloaded_error")).toBeUndefined();
	});
});

describe("proxy", () => {
	test("in `off` mode it answers a summarizer request itself, so the API never sees it", async () => {
		const calls: Call[] = [];
		const api = fakeApi(calls);
		const proxy = proxyFor("off", api);

		const reply = await post(proxy.url, summaryBody);

		expect(reply.status).toBe(200);
		expect(await reply.text()).toContain("message_stop");
		expect(calls).toHaveLength(0);
		await proxy.stop();
		expect(seenIn(await rowsIn(proxy.log)).stopped).toBe(1);
	});

	test("in `pass` mode it forwards the summarizer request and prices the answer", async () => {
		const calls: Call[] = [];
		const api = fakeApi(calls, 78_000, 120);
		const proxy = proxyFor("pass", api);

		await (await post(proxy.url, summaryBody)).text();
		await proxy.stop();

		expect(calls).toHaveLength(1);
		const seen = seenIn(await rowsIn(proxy.log));
		expect(seen.sent).toBe(1);
		expect(seen.stopped).toBe(0);
		expect(seen.cacheRead).toBe(78_000);
		expect(seen.input).toBe(120);
	});

	test("forwards a request of the session unchanged, with its path, body, and bearer", async () => {
		const calls: Call[] = [];
		const api = fakeApi(calls);
		const proxy = proxyFor("off", api);

		await (await post(proxy.url, ordinaryBody)).text();

		expect(calls[0]?.path).toBe("/v1/messages");
		expect(calls[0]?.method).toBe("POST");
		expect(calls[0]?.body).toBe(ordinaryBody);
		expect(calls[0]?.auth).toBe(TOKEN);
	});

	test("keeps the tokens of the session apart from the summarizer's", async () => {
		const calls: Call[] = [];
		const api = fakeApi(calls, 20_000, 500);
		const proxy = proxyFor("pass", api);

		await (await post(proxy.url, ordinaryBody)).text();
		await proxy.stop();

		const seen = seenIn(await rowsIn(proxy.log));
		expect(seen.cacheRead).toBe(0);
		expect(seen.armCacheRead).toBe(20_000);
		expect(seen.armInput).toBe(500);
		expect(seen.requests).toBe(1);
	});

	test("never writes the bearer token to the log, which outlives the round", async () => {
		const calls: Call[] = [];
		const api = fakeApi(calls);
		const proxy = proxyFor("pass", api);

		await (await post(proxy.url, ordinaryBody)).text();
		await proxy.stop();

		expect(await readFile(proxy.log, "utf8")).not.toContain("sk-fake-token");
	});

	// An arm of zeros has to be readable as either "no summary ran" or "the proxy never started".
	test("records that it started, before any request is made", async () => {
		const api = fakeApi([]);
		const proxy = proxyFor("off", api);

		await proxy.stop();

		expect(seenIn(await rowsIn(proxy.log)).started).toBe(1);
	});

	test("answers 502 when the API cannot be reached, so the arm ends instead of hanging", async () => {
		const proxy = proxyFor("pass", "http://127.0.0.1:1");

		const reply = await post(proxy.url, ordinaryBody);

		expect(reply.status).toBe(502);
		await proxy.stop();
		expect((await rowsIn(proxy.log)).some((r) => r.event === "failed")).toBe(
			true,
		);
	});
});
