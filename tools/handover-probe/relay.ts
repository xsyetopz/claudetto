import { appendFileSync } from "node:fs";
import { type Fake, type LogRecord, requestFacts } from "./server.ts";
import type { Usage } from "./usage.ts";

const HANDOFF_TOOL = "mcp__claudetto__handoff";

interface Reply {
	readonly id: string;
	readonly usage: Usage;
	readonly toolNames: readonly string[];
}

/** Usage arrives in `message_start` and grows in `message_delta`; tool calls start in `content_block_start`. */
const replyOfStream = (text: string): Reply => {
	let id = "";
	let usage = {} as Usage;
	const toolNames: string[] = [];
	for (const line of text.split("\n")) {
		if (!line.startsWith("data: ")) {
			continue;
		}
		const event = JSON.parse(line.slice(6));
		if (event.type === "message_start") {
			id = event.message.id;
			usage = event.message.usage;
		} else if (event.type === "message_delta") {
			usage = { ...usage, ...event.usage };
		} else if (event.type === "content_block_start" && event.content_block.type === "tool_use") {
			toolNames.push(event.content_block.name);
		}
	}
	return { id, usage, toolNames };
};

const replyOfJson = (text: string): Reply => {
	const message = JSON.parse(text);
	return {
		id: message.id,
		usage: message.usage,
		toolNames: message.content
			.filter((b: { type: string }) => b.type === "tool_use")
			.map((b: { name: string }) => b.name),
	};
};

/** Forwards every request to `upstream` unchanged and logs each Messages request with the usage the real API returned. */
export const startRelay = (opts: { readonly log: string; readonly upstream: string }): Fake => {
	let n = 0;
	const server = Bun.serve({
		port: 0,
		idleTimeout: 0,
		async fetch(req) {
			const url = new URL(req.url);
			const raw = req.method === "GET" ? undefined : await req.text();
			const headers = new Headers(req.headers);
			headers.delete("host");
			const upstream = await fetch(new URL(url.pathname + url.search, opts.upstream), {
				method: req.method,
				headers,
				body: raw,
			});
			// fetch has already decoded the body, so the encoding and length no longer describe it.
			const out = new Headers(upstream.headers);
			out.delete("content-encoding");
			out.delete("content-length");
			const logged = url.pathname.startsWith("/v1/messages") && !url.pathname.endsWith("/count_tokens") && upstream.ok;
			if (!logged || raw === undefined || upstream.body === null) {
				return new Response(upstream.body, { status: upstream.status, headers: out });
			}
			const [client, copy] = upstream.body.tee();
			const number = ++n;
			void new Response(copy).text().then((text) => {
				const facts = requestFacts(raw);
				const reply = facts.body.stream ? replyOfStream(text) : replyOfJson(text);
				const record: LogRecord = {
					n: number,
					path: url.pathname,
					host: req.headers.get("host") ?? "",
					requestId: upstream.headers.get("request-id") ?? reply.id,
					kind: facts.kind,
					calledHandoff: reply.toolNames.includes(HANDOFF_TOOL),
					contextTokens:
						(reply.usage.input_tokens ?? 0) +
						reply.usage.cache_read_input_tokens +
						reply.usage.cache_creation_input_tokens,
					toolNames: facts.toolNames,
					lastUserText: facts.lastUserText.slice(0, 200),
					cacheControlTtls: facts.ttls,
					usage: reply.usage,
				};
				appendFileSync(opts.log, `${JSON.stringify(record)}\n`);
			});
			return new Response(client, { status: upstream.status, headers: out });
		},
	});
	return { port: server.port ?? 0, stop: () => void server.stop(true) };
};

/** The result of each finished turn in `stream-json` outputs, in order. The text after the last newline may still be in the middle of a write, so it is left out. */
const resultLines = (streams: readonly string[]): readonly { is_error?: boolean; result?: string }[] =>
	streams
		.flatMap((s) => s.split("\n").slice(0, -1))
		.map((l) => JSON.parse(l))
		.filter((e) => e.type === "result");

export const resultsOf = (streams: readonly string[]): readonly string[] =>
	resultLines(streams).map((e) => String(e.result ?? ""));

/** The text of the last turn's result when that turn ended in an error, such as a refused credential. */
export const errorOf = (stream: string): string | undefined => {
	const last = resultLines([stream]).at(-1);
	return last?.is_error ? String(last.result ?? "") : undefined;
};

/** The model's answers to the recall questions: the results of the last 10 turns. */
export const answersOf = (streams: readonly string[]): readonly string[] => resultsOf(streams).slice(-10);
