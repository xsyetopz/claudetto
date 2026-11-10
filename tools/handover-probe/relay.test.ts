import { afterEach, expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { answersOf, errorOf, startRelay } from "./relay.ts";

const EVENTS: readonly (readonly [string, object])[] = [
	[
		"message_start",
		{
			message: {
				id: "msg_1",
				usage: {
					input_tokens: 7,
					cache_read_input_tokens: 900,
					cache_creation_input_tokens: 93,
					cache_creation: {
						ephemeral_5m_input_tokens: 93,
						ephemeral_1h_input_tokens: 0,
					},
					output_tokens: 1,
				},
			},
		},
	],
	[
		"content_block_start",
		{
			index: 0,
			content_block: {
				type: "tool_use",
				id: "t",
				name: "mcp__claudetto__handoff",
				input: {},
			},
		},
	],
	[
		"message_delta",
		{ delta: { stop_reason: "tool_use" }, usage: { output_tokens: 42 } },
	],
	["message_stop", {}],
];
const SSE = EVENTS.map(
	([type, data]) =>
		`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`,
).join("");

const stops: (() => void)[] = [];
afterEach(() => {
	for (const stop of stops.splice(0)) {
		stop();
	}
});

test("the relay forwards the request and logs the upstream usage, context, and handoff call", async () => {
	const seen: { key: string | null; body: string }[] = [];
	const upstream = Bun.serve({
		port: 0,
		async fetch(req) {
			seen.push({ key: req.headers.get("x-api-key"), body: await req.text() });
			return new Response(SSE, {
				headers: {
					"content-type": "text/event-stream",
					"request-id": "req_real_1",
				},
			});
		},
	});
	stops.push(() => void upstream.stop(true));
	const log = join(await mkdtemp(join(tmpdir(), "relay-")), "requests.jsonl");
	await Bun.write(log, "");
	const relay = startRelay({
		log,
		upstream: `http://127.0.0.1:${upstream.port}`,
	});
	stops.push(relay.stop);
	const body = JSON.stringify({
		model: "m",
		stream: true,
		messages: [{ role: "user", content: "Decision 1." }],
		tools: [{ name: "mcp__claudetto__handoff" }],
	});
	const res = await fetch(
		`http://127.0.0.1:${relay.port}/v1/messages?beta=true`,
		{
			method: "POST",
			headers: { "x-api-key": "sk-test", "content-type": "application/json" },
			body,
		},
	);
	expect(await res.text()).toBe(SSE);
	expect(seen).toEqual([{ key: "sk-test", body }]);
	await Bun.sleep(50);
	const logged = await Bun.file(log).text();
	const record: unknown = JSON.parse(logged.trim());
	expect(record).toMatchObject({
		n: 1,
		requestId: "req_real_1",
		kind: "main",
		calledHandoff: true,
		contextTokens: 1000,
		lastUserText: "Decision 1.",
		usage: { cache_read_input_tokens: 900, output_tokens: 42 },
	});
});

const assistant = JSON.stringify({ type: "assistant" });

const turnLine = (isError: boolean, text: string): string =>
	`${isError ? "" : `${assistant}\n`}${JSON.stringify({ type: "result", is_error: isError, result: text })}`;

const resultLine = (text: string): string =>
	JSON.stringify({ type: "result", result: text });

const answerLine = (text: string): string =>
	`${assistant}\n${resultLine(text)}`;

test("errorOf returns the text of the last turn when it ended in an error", () => {
	expect(
		errorOf(
			`${turnLine(false, "ok")}\n${turnLine(true, "Invalid auth token")}\n`,
		),
	).toBe("Invalid auth token");
	expect(
		errorOf(`${turnLine(true, "old")}\n${turnLine(false, "ok")}\n`),
	).toBeUndefined();
	expect(errorOf("")).toBeUndefined();
});

test("answersOf takes the last 10 turn results across the stream files", () => {
	const first = `${[answerLine("a"), answerLine("b")].join("\n")}\n`;
	const second = `${Array.from({ length: 10 }, (_, i) => answerLine(`r${i}`)).join("\n")}\n`;
	expect(answersOf([first, second])).toEqual(
		Array.from({ length: 10 }, (_, i) => `r${i}`),
	);
	expect(answersOf([`${first}{"type":"res`])).toEqual(["a", "b"]);
});

test("a clear's or a handover's own result is not a turn result", () => {
	const handover = [
		JSON.stringify({ type: "command_lifecycle" }),
		JSON.stringify({ type: "system", subtype: "compact_boundary" }),
		JSON.stringify({ type: "user" }),
		resultLine(""),
	];
	const stream = `${[assistant, resultLine("q1"), ...handover, assistant, resultLine("q2")].join("\n")}\n`;
	expect(answersOf([stream])).toEqual(["q1", "q2"]);
});
