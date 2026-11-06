import { mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import type { MessagesBody, Plan } from "./plan.ts";

const SERVER = join(import.meta.dir, "server.ts");
const READY = /^listening (\d+)$/m;
const SAVED = /^(\d{4})\.body\.json$/;
const START_TIMEOUT_MS = 10_000;

export interface Fake {
	url: string;
	pid: number;
	dir: string;
	stop: () => Promise<void>;
}

export interface SavedRequest {
	n: number;
	path: string;
	method: string;
	headers: Record<string, string>;
	body: MessagesBody;
	meta: {
		step?: number;
		id?: string;
		countTokens?: boolean;
		forwarded?: boolean;
		unknownPath?: boolean;
	};
}

// Starts the fake in its own process. `dir` receives one NNNN.{body,headers,meta}.json triple per request, in arrival order.
export const startFake = async (opts: {
	plan: Plan;
	dir: string;
	forward?: string;
}): Promise<Fake> => {
	await mkdir(opts.dir, { recursive: true });
	const planPath = join(opts.dir, "plan.json");
	await Bun.write(planPath, JSON.stringify(opts.plan, null, "\t"));
	const proc = Bun.spawn(
		[
			"bun",
			SERVER,
			planPath,
			opts.dir,
			...(opts.forward ? [opts.forward] : []),
		],
		{
			stdin: "ignore",
			stdout: "pipe",
			stderr: "inherit",
		},
	);
	const port = await readPort(proc.stdout);
	const stop = async (): Promise<void> => {
		proc.kill();
		await proc.exited;
	};
	return {
		url: `http://127.0.0.1:${port}`,
		pid: proc.pid,
		dir: opts.dir,
		stop,
	};
};

export const readRequests = async (dir: string): Promise<SavedRequest[]> => {
	const ns = (await readdir(dir))
		.map((f) => SAVED.exec(f)?.[1])
		.filter((n): n is string => n !== undefined)
		.sort((a, b) => a.localeCompare(b));
	return Promise.all(
		ns.map(async (n) => {
			const file = (kind: string): string => join(dir, `${n}.${kind}.json`);
			const [body, head, meta] = await Promise.all([
				readJson<MessagesBody>(file("body")),
				readJson<SavedHead>(file("headers")),
				readJson<SavedRequest["meta"]>(file("meta")),
			]);
			return {
				n: Number(n),
				path: head?.path ?? "",
				method: head?.method ?? "",
				headers: head?.headers ?? {},
				body: body ?? {},
				meta: meta ?? {},
			};
		}),
	);
};

interface SavedHead {
	method: string;
	path: string;
	headers: Record<string, string>;
}

// The /v1/messages requests, without count_tokens, in order.
export const mainRequests = (requests: SavedRequest[]): SavedRequest[] =>
	requests.filter(
		(r) =>
			r.path.startsWith("/v1/messages") &&
			!r.meta.countTokens,
	);

// The files are the fake's own output, so their shape is known.
const readJson = async <T>(path: string): Promise<T | undefined> => {
	const f = Bun.file(path);
	return (await f.exists()) ? f.json() : undefined;
};

const readPort = async (
	stream: ReadableStream<Uint8Array>,
): Promise<number> => {
	const decoder = new TextDecoder();
	let seen = "";
	const deadline = Date.now() + START_TIMEOUT_MS;
	for await (const chunk of stream) {
		seen += decoder.decode(chunk);
		const port = READY.exec(seen)?.[1];
		if (port) {
			return Number(port);
		}
		if (Date.now() > deadline) {
			break;
		}
	}
	throw new Error(
		`fake did not print "listening <port>" within ${START_TIMEOUT_MS} ms; got: ${seen}`,
	);
};
