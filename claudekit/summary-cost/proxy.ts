import { appendFile } from "node:fs/promises";
import { serve } from "bun";
import { objectOf } from "./json.ts";
import type { Usage } from "./log.ts";
import { answer, isSummary } from "./stub.ts";

export type Mode = "pass" | "off";

export const UPSTREAM = "https://api.anthropic.com";

export const targetOf = (url: string, upstream: string): string => {
	const incoming = new URL(url);
	const to = new URL(upstream);
	to.pathname = incoming.pathname;
	to.search = incoming.search;
	return to.toString();
};

const TOKEN_KEYS = [
	"input_tokens",
	"output_tokens",
	"cache_creation_input_tokens",
	"cache_read_input_tokens",
] as const;

const tokensOf = (value: unknown): Usage | undefined => {
	const held = objectOf(value);
	const usage: Usage = {};
	let any = false;
	for (const key of TOKEN_KEYS) {
		const count = held[key];
		if (typeof count === "number") {
			usage[key] = count;
			any = true;
		}
	}
	return any ? usage : undefined;
};

export const usageIn = (text: string): Usage | undefined => {
	const line = text
		.split("\n")
		.find((l) => l.startsWith("data:") && l.includes('"message_start"'));
	let parsed: unknown;
	try {
		parsed = JSON.parse(line === undefined ? text : line.slice(5).trim());
	} catch {
		return undefined;
	}
	const held = objectOf(parsed);
	return (
		tokensOf(objectOf(held["message"])["usage"]) ?? tokensOf(held["usage"])
	);
};

interface Note {
	(row: Record<string, unknown>): void;
	/** Resolves when every row written so far is on disk, so a stopped arm loses no count. */
	done: () => Promise<void>;
}

/** The writes are chained, because two appends in flight could interleave into an unparsable row. */
const writer = (logFile: string, mode: Mode): Note => {
	let writing = Promise.resolve();
	const note = (row: Record<string, unknown>): void => {
		const line = `${JSON.stringify({ pid: process.pid, mode, ...row })}\n`;
		const before = writing;
		writing = (async () => {
			try {
				await before;
				await appendFile(logFile, line);
			} catch {
				// A measurement that cannot be written is not a reason to break the session.
			}
		})();
	};
	return Object.assign(note, { done: (): Promise<void> => writing });
};

/** Reads the tokens of an answer from a clone, so the caller still gets the whole stream. */
const record = async (
	response: Response,
	summary: boolean,
	note: Note,
): Promise<void> => {
	try {
		const usage = usageIn(await response.clone().text());
		if (usage === undefined) {
			note({ event: "no-usage", summary, status: response.status });
			return;
		}
		note({ event: "usage", summary, usage });
	} catch (error) {
		// An answer whose tokens could not be read is not an answer of zero, so it is recorded.
		note({ event: "unread", summary, why: String(error).slice(0, 120) });
	}
};

const forwarded = (request: Request): Headers => {
	const headers = new Headers(request.headers);
	// `accept-encoding` goes so the body that reaches the session is the body that arrived here.
	for (const name of ["host", "content-length", "accept-encoding"]) {
		headers.delete(name);
	}
	return headers;
};

interface Context {
	mode: Mode;
	upstream: string;
	note: Note;
}

const handle = async (request: Request, ctx: Context): Promise<Response> => {
	const hasBody = request.method !== "GET" && request.method !== "HEAD";
	const body = hasBody ? await request.text() : "";
	const encoding = request.headers.get("content-encoding");
	if (encoding !== null) {
		// Recorded, because a compressed body cannot be matched and would read as "the summarizer never ran".
		ctx.note({ event: "opaque", encoding });
	}
	const summary = encoding === null && isSummary(body);

	if (summary && ctx.mode === "off") {
		ctx.note({ event: "stopped", bodyChars: body.length });
		return answer(body);
	}
	if (summary) {
		ctx.note({ event: "sent", bodyChars: body.length });
	}
	ctx.note({
		event: "request",
		summary,
		method: request.method,
		path: new URL(request.url).pathname,
	});

	let upstream: Response;
	try {
		upstream = await fetch(targetOf(request.url, ctx.upstream), {
			method: request.method,
			headers: forwarded(request),
			...(hasBody && body !== "" ? { body } : {}),
			redirect: "manual",
		});
	} catch (error) {
		ctx.note({ event: "failed", why: String(error).slice(0, 120) });
		return new Response("proxy could not reach the API", { status: 502 });
	}

	// Not awaited: the answer goes back to the session now and the tokens come from a clone.
	void record(upstream, summary, ctx.note);
	const out = new Headers(upstream.headers);
	for (const name of ["content-encoding", "content-length"]) {
		out.delete(name);
	}
	return new Response(upstream.body, { status: upstream.status, headers: out });
};

export interface Proxy {
	url: string;
	stop: () => Promise<void>;
}

export const start = (
	mode: Mode,
	logFile: string,
	upstream: string = UPSTREAM,
): Proxy => {
	const note = writer(logFile, mode);
	const server = serve({
		hostname: "127.0.0.1",
		port: 0,
		// A model turn can stream for minutes, and the default idle timeout would cut it off.
		idleTimeout: 0,
		fetch: (request) => handle(request, { mode, upstream, note }),
	});
	note({ event: "started", upstream: new URL(upstream).host });
	return {
		url: `http://127.0.0.1:${server.port}`,
		stop: async (): Promise<void> => {
			await server.stop(true);
			await note.done();
		},
	};
};

if (import.meta.main) {
	const argv = process.argv.slice(2);
	const log =
		argv.find((a) => !a.startsWith("-")) ??
		"/tmp/claudetto-summary-proxy.jsonl";
	const mode: Mode = argv.includes("--pass") ? "pass" : "off";
	const proxy = start(mode, log);
	process.stdout.write(
		`Summary mode \`${mode}\`, log \`${log}\`.\nRun your session with:\n  ANTHROPIC_BASE_URL=${proxy.url} claude\n`,
	);
}
