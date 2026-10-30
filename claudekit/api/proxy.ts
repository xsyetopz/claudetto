import { appendFile } from "node:fs/promises";
import { serve } from "bun";
import { answerHeaders, sendOn, UPSTREAM, usageIn } from "./forward.ts";
import { isSummary, summaryAnswer } from "./summary.ts";

export type Mode = "pass" | "off";

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

interface Context {
	mode: Mode;
	upstream: string;
	note: Note;
}

const handle = async (request: Request, ctx: Context): Promise<Response> => {
	const body =
		request.method === "GET" || request.method === "HEAD"
			? ""
			: await request.text();
	const encoding = request.headers.get("content-encoding");
	if (encoding !== null) {
		// Recorded, because a compressed body cannot be matched and would read as "the summarizer never ran".
		ctx.note({ event: "opaque", encoding });
	}
	const summary = encoding === null && isSummary(body);

	if (summary && ctx.mode === "off") {
		ctx.note({ event: "stopped", bodyChars: body.length });
		return summaryAnswer(body);
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
		upstream = await sendOn(request, body, ctx.upstream);
	} catch (error) {
		ctx.note({ event: "failed", why: String(error).slice(0, 120) });
		return new Response("proxy could not reach the API", { status: 502 });
	}

	// Not awaited: the answer goes back to the session now and the tokens come from a clone.
	void record(upstream, summary, ctx.note);
	return new Response(upstream.body, {
		status: upstream.status,
		headers: answerHeaders(upstream),
	});
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
