import { appendFileSync } from "node:fs";
import { FORK_PROMPT } from "../../plugins/claudetto/hooks/texts.ts";
import { fakeContextTokens, fakeUsage } from "./fake.ts";
import { HANDOFF_ASK } from "./task.ts";
import type { Usage } from "./usage.ts";

export type Kind = "main" | "fork" | "summarizer" | "other";

/** One line of the server log: what a request was, and the FAKE usage the server answered with. */
export interface LogRecord {
	readonly n: number;
	readonly path: string;
	readonly host: string;
	readonly requestId: string;
	readonly kind: Kind;
	/** The scripted reply was a call of the handoff tool. */
	readonly calledHandoff: boolean;
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

const SUMMARIZER = /create a detailed summary/i;

/** A side request (a grader, a classifier) carries no tools. A fork repeats the main request, so it keeps them. */
export const classify = (lastText: string, tools: number): Kind =>
	lastText.startsWith(FORK_PROMPT.slice(0, 40))
		? "fork"
		: SUMMARIZER.test(lastText)
			? "summarizer"
			: tools === 0
				? "other"
				: "main";

/** What the log needs from a request body, the same for the fake server and the relay. */
export const requestFacts = (raw: string) => {
	const body = JSON.parse(raw) as Body;
	const lastUserText = textOf(body.messages.findLast((m) => m.role === "user"));
	return {
		body,
		lastUserText,
		kind: classify(lastUserText, body.tools?.length ?? 0),
		ttls: [...raw.matchAll(/"ttl":"(\w+)"/g)].map((m) => m[1] ?? ""),
		toolNames: (body.tools ?? []).map((t) => t.name),
	};
};

const FAKE_HANDOFF = [
	"# Handoff",
	"",
	"Written by Claude at FAKE.",
	"## Goal",
	"",
	"FAKE handoff from the fake model.",
	"## Standing Instructions",
	"",
	"None.",
	"## Decisions Log",
	"",
	"FAKE: the fake model keeps no decisions.",
	"## Current State",
	"",
	"FAKE.",
	"## Next Steps",
	"",
	"Continue.",
].join("\n");

const HANDOFF_INPUT = {
	goal: "FAKE goal",
	standing: "FAKE standing",
	state: "FAKE state",
	decisions: "FAKE decisions",
	next_prompt: "Continue the ledger service from the handoff (FAKE).",
};

type Reply =
	| { readonly text: string }
	| { readonly tool: string; readonly input: unknown };

const sse = (id: string, reply: Reply, usage: Usage): string => {
	const ev = (type: string, data: unknown) =>
		`event: ${type}\ndata: ${JSON.stringify({ type, ...(data as object) })}\n\n`;
	const start = ev("message_start", {
		message: {
			id,
			type: "message",
			role: "assistant",
			model: "claude-opus-5-5",
			content: [],
			stop_reason: null,
			usage: { ...usage, output_tokens: 1 },
		},
	});
	const block =
		"text" in reply
			? ev("content_block_start", {
					index: 0,
					content_block: { type: "text", text: "" },
				}) +
				ev("content_block_delta", {
					index: 0,
					delta: { type: "text_delta", text: reply.text },
				})
			: ev("content_block_start", {
					index: 0,
					content_block: {
						type: "tool_use",
						id: `toolu_${id}`,
						name: reply.tool,
						input: {},
					},
				}) +
				ev("content_block_delta", {
					index: 0,
					delta: {
						type: "input_json_delta",
						partial_json: JSON.stringify(reply.input),
					},
				});
	return (
		start +
		block +
		ev("content_block_stop", { index: 0 }) +
		ev("message_delta", {
			delta: { stop_reason: "text" in reply ? "end_turn" : "tool_use" },
			usage: { output_tokens: 5 },
		}) +
		ev("message_stop", {})
	);
};

export interface Fake {
	readonly port: number;
	readonly stop: () => void;
}

/** A fake Messages API. With `handoffOnBoundary`, a prompt that ends a task gets a scripted `mcp__claudetto__handoff` call. Every usage number it returns is FAKE. */
export const startFake = (opts: {
	readonly log: string;
	readonly handoffOnBoundary: boolean;
}): Fake => {
	let n = 0;
	const previous = new Map<string, number>();
	const server = Bun.serve({
		port: 0,
		async fetch(req) {
			const url = new URL(req.url);
			if (!url.pathname.startsWith("/v1/messages")) {
				return Response.json({});
			}
			if (url.pathname.endsWith("/count_tokens")) {
				return Response.json({ input_tokens: 100 });
			}
			const raw = await req.text();
			if (process.env["PROBE_BODIES"] !== undefined) {
				appendFileSync(process.env["PROBE_BODIES"], `${JSON.stringify({ raw })}\n`);
			}
			const { body, lastUserText, kind, ttls, toolNames } = requestFacts(raw);
			const requestId = `req_fake_${++n}`;
			const total = fakeContextTokens(body.messages);
			const prefix = textOf(body.messages[0]);
			const usage = {
				...fakeUsage({
					total,
					previous: previous.get(prefix) ?? 0,
					ttl: ttls.at(-1) === "1h" ? "1h" : "5m",
				}),
				output_tokens: 5,
			};

			previous.set(prefix, total);
			const reply: Reply =
				kind === "fork"
					? { text: FAKE_HANDOFF }
					: kind === "summarizer"
						? { text: "<summary>FAKE summary of the conversation.</summary>" }
						: opts.handoffOnBoundary &&
								lastUserText.includes(HANDOFF_ASK) &&
								body.tools?.some((t) => t.name === "mcp__claudetto__handoff")
							? { tool: "mcp__claudetto__handoff", input: HANDOFF_INPUT }
							: { text: "FAKE reply." };
			const record: LogRecord = {
				n,
				path: url.pathname,
				host: req.headers.get("host") ?? "",
				requestId,
				kind,
				calledHandoff: "tool" in reply,
				contextTokens: total,
				toolNames,
				lastUserText: lastUserText.slice(0, 200),
				cacheControlTtls: ttls,
				usage,
			};
			appendFileSync(opts.log, `${JSON.stringify(record)}\n`);
			const headers = { "request-id": requestId };
			return body.stream
				? new Response(sse(requestId, reply, usage), {
						headers: { ...headers, "content-type": "text/event-stream" },
					})
				: Response.json(
						{
							id: requestId,
							type: "message",
							role: "assistant",
							model: body.model,
							content:
								"text" in reply
									? [{ type: "text", text: reply.text }]
									: [{ type: "tool_use", id: "t", name: reply.tool, input: reply.input }],
							stop_reason: "text" in reply ? "end_turn" : "tool_use",
							usage,
						},
						{ headers },
					);
		},
	});
	return { port: server.port ?? 0, stop: () => void server.stop(true) };
};
