import {
	type Fake,
	logAppender,
	type LogRecord,
	requestFacts,
} from "./server.ts";
import type { Usage } from "./usage.ts";

const HANDOFF_TOOL = "mcp__claudetto__handoff";
const EMPTY_USAGE: Usage = {
	output_tokens: 0,
	cache_read_input_tokens: 0,
	cache_creation_input_tokens: 0,
};

interface Reply {
	readonly id: string;
	readonly usage: Usage;
	readonly toolNames: readonly string[];
}

const asRecord = (v: unknown): Record<string, unknown> =>
	typeof v === "object" && v !== null
		? Object.fromEntries(Object.entries(v))
		: {};
const text = (v: unknown): string => (typeof v === "string" ? v : "");
const isUsage = (v: unknown): v is Usage =>
	typeof v === "object" &&
	v !== null &&
	"output_tokens" in v &&
	typeof v.output_tokens === "number";
const isUsagePart = (v: unknown): v is Partial<Usage> =>
	typeof v === "object" && v !== null;

/** Usage arrives in `message_start` and grows in `message_delta`; tool calls start in `content_block_start`. */
const replyOfStream = (body: string): Reply => {
	let id = "";
	let usage = EMPTY_USAGE;
	const toolNames: string[] = [];
	for (const line of body.split("\n")) {
		if (!line.startsWith("data: ")) {
			continue;
		}
		const event = asRecord(JSON.parse(line.slice(6)));
		if (event.type === "message_start") {
			const message = asRecord(event.message);
			id = text(message.id);
			usage = isUsage(message.usage) ? message.usage : EMPTY_USAGE;
		} else if (event.type === "message_delta") {
			usage = isUsagePart(event.usage) ? { ...usage, ...event.usage } : usage;
		} else if (event.type === "content_block_start") {
			const block = asRecord(event.content_block);
			if (block.type === "tool_use") {
				toolNames.push(text(block.name));
			}
		}
	}
	return { id, usage, toolNames };
};

const replyOfJson = (body: string): Reply => {
	const message = asRecord(JSON.parse(body));
	const content: unknown[] = Array.isArray(message.content)
		? message.content
		: [];
	return {
		id: text(message.id),
		usage: isUsage(message.usage) ? message.usage : EMPTY_USAGE,
		toolNames: content
			.map((b) => asRecord(b))
			.filter((b) => b.type === "tool_use")
			.map((b) => text(b.name)),
	};
};

const recordOf = (
	n: number,
	req: Request,
	upstream: Response,
	raw: string,
	body: string,
): LogRecord => {
	const facts = requestFacts(raw);
	const reply =
		facts.body.stream === true ? replyOfStream(body) : replyOfJson(body);
	return {
		n,
		path: new URL(req.url).pathname,
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
};

const isLogged = (url: URL, upstream: Response): boolean =>
	url.pathname.startsWith("/v1/messages") &&
	!url.pathname.endsWith("/count_tokens") &&
	upstream.ok;

const fetchUpstream = async (
	req: Request,
	url: URL,
	raw: string | undefined,
	base: string,
): Promise<{ upstream: Response; out: Headers }> => {
	const headers = new Headers(req.headers);
	headers.delete("host");
	const upstream = await fetch(new URL(url.pathname + url.search, base), {
		method: req.method,
		headers,
		body: raw,
	});
	// fetch has already decoded the body, so the encoding and length no longer describe it.
	const out = new Headers(upstream.headers);
	out.delete("content-encoding");
	out.delete("content-length");
	return { upstream, out };
};

/** Forwards every request to `upstream` unchanged and logs each Messages request with the usage the real API returned. */
export const startRelay = (opts: {
	readonly log: string;
	readonly upstream: string;
}): Fake => {
	let n = 0;
	const log = logAppender(opts.log);
	const pending: Promise<void>[] = [];
	const logReply = async (
		number: number,
		req: Request,
		upstream: Response,
		raw: string,
		copy: ReadableStream<Uint8Array>,
	): Promise<void> => {
		const body = await new Response(copy).text();
		log.append(
			`${JSON.stringify(recordOf(number, req, upstream, raw, body))}\n`,
		);
	};
	const forward = async (req: Request): Promise<Response> => {
		const url = new URL(req.url);
		const raw = req.method === "GET" ? undefined : await req.text();
		const { upstream, out } = await fetchUpstream(req, url, raw, opts.upstream);
		if (
			!isLogged(url, upstream) ||
			raw === undefined ||
			upstream.body === null
		) {
			return new Response(upstream.body, {
				status: upstream.status,
				headers: out,
			});
		}
		const [client, copy] = upstream.body.tee();
		pending.push(logReply(++n, req, upstream, raw, copy));
		return new Response(client, { status: upstream.status, headers: out });
	};
	const server = Bun.serve({ port: 0, idleTimeout: 0, fetch: forward });
	return {
		port: server.port ?? 0,
		stop: () => void server.stop(true),
		flushed: async () => {
			await Promise.all(pending);
			await log.flushed();
		},
	};
};

interface StreamEvent {
	readonly type: string;
	readonly is_error: boolean;
	readonly result: string;
}

const eventOf = (line: string): StreamEvent => {
	const v = asRecord(JSON.parse(line));
	return {
		type: text(v.type),
		is_error: v.is_error === true,
		result: text(v.result),
	};
};

/** The result of each finished turn in `stream-json` outputs, in order. The text after the last newline may still be in the middle of a write, so it is left out. A clear or a handover ends in a result of its own with no `assistant` event before it; that result answers no prompt. */
const resultLines = (streams: readonly string[]): readonly StreamEvent[] => {
	const turns: StreamEvent[] = [];
	let answered = false;
	for (const e of streams
		.flatMap((s) => s.split("\n").slice(0, -1))
		.map((l) => eventOf(l))) {
		if (e.type === "assistant") {
			answered = true;
		} else if (e.type === "result") {
			if (answered || e.is_error) {
				turns.push(e);
			}
			answered = false;
		}
	}
	return turns;
};

export const resultsOf = (streams: readonly string[]): readonly string[] =>
	resultLines(streams).map((e) => e.result);

/** The text of the last turn's result when that turn ended in an error, such as a refused credential. */
export const errorOf = (stream: string): string | undefined => {
	const last = resultLines([stream]).at(-1);
	return last?.is_error === true ? last.result : undefined;
};

/** The model's answers to the recall questions: the results of the last 10 turns. */
export const answersOf = (streams: readonly string[]): readonly string[] =>
	resultsOf(streams).slice(-10);
