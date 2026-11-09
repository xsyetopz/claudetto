import { afterEach, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { answersOf, errorOf, startRelay } from "./relay.ts";

const SSE = [
	["message_start", { message: { id: "msg_1", usage: { input_tokens: 7, cache_read_input_tokens: 900, cache_creation_input_tokens: 93, cache_creation: { ephemeral_5m_input_tokens: 93, ephemeral_1h_input_tokens: 0 }, output_tokens: 1 } } }],
	["content_block_start", { index: 0, content_block: { type: "tool_use", id: "t", name: "mcp__claudetto__handoff", input: {} } }],
	["message_delta", { delta: { stop_reason: "tool_use" }, usage: { output_tokens: 42 } }],
	["message_stop", {}],
]
	.map(([type, data]) => `event: ${type}\ndata: ${JSON.stringify({ type, ...(data as object) })}\n\n`)
	.join("");

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
				headers: { "content-type": "text/event-stream", "request-id": "req_real_1" },
			});
		},
	});
	stops.push(() => upstream.stop(true));
	const log = join(mkdtempSync(join(tmpdir(), "relay-")), "requests.jsonl");
	writeFileSync(log, "");
	const relay = startRelay({ log, upstream: `http://127.0.0.1:${upstream.port}` });
	stops.push(relay.stop);
	const body = JSON.stringify({
		model: "m",
		stream: true,
		messages: [{ role: "user", content: "Decision 1." }],
		tools: [{ name: "mcp__claudetto__handoff" }],
	});
	const res = await fetch(`http://127.0.0.1:${relay.port}/v1/messages?beta=true`, {
		method: "POST",
		headers: { "x-api-key": "sk-test", "content-type": "application/json" },
		body,
	});
	expect(await res.text()).toBe(SSE);
	expect(seen).toEqual([{ key: "sk-test", body }]);
	await Bun.sleep(50);
	const record = JSON.parse(readFileSync(log, "utf8").trim());
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

test("errorOf returns the text of the last turn when it ended in an error", () => {
	const result = (is_error: boolean, result: string) => JSON.stringify({ type: "result", is_error, result });
	expect(errorOf(`${result(false, "ok")}\n${result(true, "Invalid auth token")}\n`)).toBe("Invalid auth token");
	expect(errorOf(`${result(true, "old")}\n${result(false, "ok")}\n`)).toBeUndefined();
	expect(errorOf("")).toBeUndefined();
});

test("answersOf takes the last 10 turn results across the stream files", () => {
	const line = (result: string) => JSON.stringify({ type: "result", result });
	const first = `${[line("a"), JSON.stringify({ type: "assistant" }), line("b")].join("\n")}\n`;
	const second = `${Array.from({ length: 10 }, (_, i) => line(`r${i}`)).join("\n")}\n`;
	expect(answersOf([first, second])).toEqual(Array.from({ length: 10 }, (_, i) => `r${i}`));
	expect(answersOf([`${first}{"type":"res`])).toEqual(["a", "b"]);
});
