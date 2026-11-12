import { appendFile } from "node:fs/promises";

import { fakeContextTokens, fakeUsage } from "./fake.ts";
import { type Reply, sse } from "./sse.ts";
import type { Usage } from "./usage.ts";

export type Kind = "main" | "summarizer" | "other";

/** One line of the server log: what a request was, and the FAKE usage the server answered with. */
export interface LogRecord {
	readonly n: number;
	readonly path: string;
	readonly host: string;
	readonly requestId: string;
	readonly kind: Kind;
	readonly contextTokens: number;
	readonly toolNames: readonly string[];
	readonly lastUserText: string;
	readonly cacheControlTtls: readonly string[];
	readonly usage: Usage;
}

interface Block {
	readonly type: string;
	readonly text?: string;
}
interface Message {
	readonly role: string;
	readonly content: string | readonly Block[];
}
interface Body {
	readonly stream?: boolean;
	readonly model: string;
	readonly messages: readonly Message[];
	readonly tools?: readonly { readonly name: string }[];
}

const textOf = (m: Message | undefined): string =>
	typeof m?.content === "string"
		? m.content
		: (m?.content ?? []).map((b) => b.text ?? "").join("\n");

const lastUser = (messages: readonly Message[]): Message | undefined => {
	for (let i = messages.length - 1; i >= 0; i--) {
		if (messages[i]?.role === "user") {
			return messages[i];
		}
	}
	return undefined;
};

const SUMMARIZER = /create a detailed summary/iu;

/** A side request (a grader, a classifier) carries no tools. */
export const classify = (lastText: string, tools: number): Kind => {
	if (SUMMARIZER.test(lastText)) {
		return "summarizer";
	}
	return tools === 0 ? "other" : "main";
};

const isBody = (v: unknown): v is Body =>
	typeof v === "object" &&
	v !== null &&
	"messages" in v &&
	Array.isArray(v.messages);

const parseBody = (raw: string): Body => {
	const body: unknown = JSON.parse(raw);
	if (!isBody(body)) {
		throw new TypeError("a request body holds no `messages` list");
	}
	return body;
};

/** What the log needs from a request body. */
export const requestFacts = (raw: string) => {
	const body = parseBody(raw);
	const lastUserText = textOf(lastUser(body.messages));
	return {
		body,
		lastUserText,
		kind: classify(lastUserText, body.tools?.length ?? 0),
		ttls: [...raw.matchAll(/"ttl":"(\w+)"/gu)].map((m) => m[1] ?? ""),
		toolNames: (body.tools ?? []).map((t) => t.name),
	};
};

export interface Fake {
	readonly port: number;
	readonly stop: () => void;
	/** Resolves when every log line handed to the server so far is on disk. */
	readonly flushed: () => Promise<void>;
}

const appendAfter = async (
	previous: Promise<void>,
	path: string,
	line: string,
): Promise<void> => {
	await previous;
	await appendFile(path, line);
};

/** Appends lines to a file in the order they were handed over. */
export const logAppender = (path: string) => {
	let tail: Promise<void> = Promise.resolve();
	return {
		append: (line: string): void => {
			tail = appendAfter(tail, path, line);
		},
		flushed: (): Promise<void> => tail,
	};
};

const replyFor = (kind: Kind): Reply =>
	kind === "summarizer"
		? { text: "<summary>FAKE summary of the conversation.</summary>" }
		: { text: "FAKE reply." };

const respond = (
	body: Body,
	requestId: string,
	reply: Reply,
	usage: Usage,
): Response => {
	const headers = { "request-id": requestId };
	if (body.stream === true) {
		return new Response(sse(requestId, reply, usage), {
			headers: { ...headers, "content-type": "text/event-stream" },
		});
	}
	return Response.json(
		{
			id: requestId,
			type: "message",
			role: "assistant",
			model: body.model,
			content:
				"text" in reply
					? [{ type: "text", text: reply.text }]
					: [
							{
								type: "tool_use",
								id: "t",
								name: reply.tool,
								input: reply.input,
							},
						],
			stop_reason: "text" in reply ? "end_turn" : "tool_use",
			usage,
		},
		{ headers },
	);
};

interface FakeState {
	n: number;
	readonly previous: Map<string, number>;
	readonly log: ReturnType<typeof logAppender>;
	readonly bodies: ReturnType<typeof logAppender> | undefined;
}

const answer = async (
	state: FakeState,
	req: Request,
	url: URL,
): Promise<Response> => {
	const raw = await req.text();
	state.bodies?.append(`${JSON.stringify({ raw })}\n`);
	const { body, lastUserText, kind, ttls, toolNames } = requestFacts(raw);
	const requestId = `req_fake_${++state.n}`;
	const total = fakeContextTokens(body.messages);
	const prefix = textOf(body.messages[0]);
	const usage = {
		...fakeUsage({
			total,
			previous: state.previous.get(prefix) ?? 0,
			ttl: ttls.at(-1) === "1h" ? "1h" : "5m",
		}),
		output_tokens: 5,
	};
	state.previous.set(prefix, total);
	const reply = replyFor(kind);
	const record: LogRecord = {
		n: state.n,
		path: url.pathname,
		host: req.headers.get("host") ?? "",
		requestId,
		kind,
		contextTokens: total,
		toolNames,
		lastUserText: lastUserText.slice(0, 200),
		cacheControlTtls: ttls,
		usage,
	};
	state.log.append(`${JSON.stringify(record)}\n`);
	return respond(body, requestId, reply, usage);
};

/** A fake Messages API: it answers a summarizer request with a fixed summary and any other with a fixed reply. Every usage number it returns is FAKE. */
export const startFake = (opts: { readonly log: string }): Fake => {
	const bodiesPath = process.env.PROBE_BODIES;
	const state: FakeState = {
		n: 0,
		previous: new Map<string, number>(),
		log: logAppender(opts.log),
		bodies: bodiesPath === undefined ? undefined : logAppender(bodiesPath),
	};
	const server = Bun.serve({
		port: 0,
		fetch(req) {
			const url = new URL(req.url);
			if (!url.pathname.startsWith("/v1/messages")) {
				return Response.json({});
			}
			if (url.pathname.endsWith("/count_tokens")) {
				return Response.json({ input_tokens: 100 });
			}
			return answer(state, req, url);
		},
	});
	return {
		port: server.port ?? 0,
		stop: () => void server.stop(true),
		flushed: () => state.log.flushed(),
	};
};
