// The request stream of this login's own transcripts, read only. No model call, no
// network. No message text is kept: only token counts, tool names, and file paths.
// Sidechain (subagent) requests are kept, because they are billed like any other.

import { homedir } from "node:os";
import { join } from "node:path";
import { file as bunFile, Glob } from "bun";

/** Probe forks are not real work, so their transcripts are skipped. */
const SKIP = "claudetto-probe";

/** Tools whose `file_path` input names a file the session now holds in context. */
const READERS = new Set(["Read", "Edit", "Write", "NotebookEdit", "MultiEdit"]);

/** Narrows to a plain object; an array and `null` are refused. */
export const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const num = (value: unknown): number => (typeof value === "number" ? value : 0);

const str = (value: unknown): string =>
	typeof value === "string" ? value : "";

/** One assistant request, with the three billed prompt lines kept apart. */
export interface Request {
	readonly kind: "request";
	/** `input_tokens`: the part of the prompt that no cache served. */
	readonly fresh: number;
	/** `cache_read_input_tokens`. */
	readonly read: number;
	/** `cache_creation_input_tokens`. */
	readonly write: number;
	readonly out: number;
	readonly model: string;
	/** Epoch ms of the record, or 0 when it carries no timestamp. */
	readonly at: number;
	readonly tools: readonly string[];
	readonly paths: readonly string[];
}

/** One `compact_boundary` record, with its `compactMetadata`. */
export interface Boundary {
	readonly kind: "boundary";
	readonly trigger: string;
	readonly pre: number;
	readonly post: number;
	readonly ms: number;
}

/** The summary a compaction produced: a `user` message with `isCompactSummary`. */
export interface Summary {
	readonly kind: "summary";
	readonly chars: number;
}

/** A record of a session that the loader keeps; every other record of the transcript is dropped. */
export type Item = Request | Boundary | Summary;

/**
 * Tokens per character of the summary. The transcript records no token count for
 * it, because the summarizer request writes no `usage` record, so its size is the
 * character count over this divisor, as `docs/evidence/compaction/boundaries.md`
 * does it.
 */
export const CHARS_PER_TOKEN = 4;

/** A session: its items in order, kept only when a compaction happened in it. */
export type Session = readonly Item[];

/** The prompt this request was billed for. */
export const sizeOf = (request: Request): number =>
	request.fresh + request.read + request.write;

const boundaryOf = (row: Record<string, unknown>): Boundary => {
	const meta = isRecord(row["compactMetadata"]) ? row["compactMetadata"] : {};
	return {
		kind: "boundary",
		trigger: str(meta["trigger"]),
		pre: num(meta["preTokens"]),
		post: num(meta["postTokens"]),
		ms: num(meta["durationMs"]),
	};
};

const requestOf = (
	row: Record<string, unknown>,
	message: Record<string, unknown>,
	usage: Record<string, unknown>,
): Request => {
	const tools: string[] = [];
	const paths: string[] = [];
	const content = message["content"];
	for (const part of Array.isArray(content) ? content : []) {
		if (!isRecord(part) || part["type"] !== "tool_use") {
			continue;
		}
		const name = str(part["name"]);
		tools.push(name);
		const input = part["input"];
		if (READERS.has(name) && isRecord(input)) {
			const path = input["file_path"];
			if (typeof path === "string") {
				paths.push(path);
			}
		}
	}
	return {
		kind: "request",
		fresh: num(usage["input_tokens"]),
		read: num(usage["cache_read_input_tokens"]),
		write: num(usage["cache_creation_input_tokens"]),
		out: num(usage["output_tokens"]),
		model: str(message["model"]),
		at: Date.parse(str(row["timestamp"])) || 0,
		tools,
		paths,
	};
};

/** The characters of a `user` message, whichever shape its content has. */
const charsOf = (message: Record<string, unknown>): number => {
	const content = message["content"];
	if (typeof content === "string") {
		return content.length;
	}
	let chars = 0;
	for (const part of Array.isArray(content) ? content : []) {
		if (isRecord(part) && typeof part["text"] === "string") {
			chars += part["text"].length;
		}
	}
	return chars;
};

/** One transcript line as an item, or none for a line that is neither. */
const itemOf = (line: string): Item | undefined => {
	let row: unknown;
	try {
		row = JSON.parse(line);
	} catch {
		return undefined;
	}
	if (!isRecord(row)) {
		return undefined;
	}
	if (row["type"] === "system" && row["subtype"] === "compact_boundary") {
		return boundaryOf(row);
	}
	if (row["type"] === "user" && row["isCompactSummary"] === true) {
		const message = isRecord(row["message"]) ? row["message"] : {};
		return { kind: "summary", chars: charsOf(message) };
	}
	if (row["type"] !== "assistant") {
		return undefined;
	}
	const message = isRecord(row["message"]) ? row["message"] : {};
	const usage = message["usage"];
	return isRecord(usage) ? requestOf(row, message, usage) : undefined;
};

const itemsOf = (text: string): Item[] => {
	const items: Item[] = [];
	for (const line of text.split("\n")) {
		const item = line.trim() === "" ? undefined : itemOf(line);
		if (item !== undefined) {
			items.push(item);
		}
	}
	return items;
};

/** Every session under `root` that holds at least one compaction, in path order. */
export const loadSessions = async (
	root = join(homedir(), ".claude", "projects"),
): Promise<Session[]> => {
	const files = (await Array.fromAsync(new Glob("*/*.jsonl").scan(root)))
		.filter((name) => !name.includes(SKIP))
		.sort((a, b) => Number(a > b) - Number(a < b));
	const sessions = await Promise.all(
		files.map(async (name) => itemsOf(await bunFile(join(root, name)).text())),
	);
	return sessions.filter((items) =>
		items.some((item) => item.kind === "boundary"),
	);
};

/** Every `Request` of `sessions` in file order, with the boundaries and summaries left out. */
export const requestsOf = (sessions: readonly Session[]): Request[] =>
	sessions.flat().filter((item): item is Request => item.kind === "request");

/** Every `Boundary` of `sessions` in file order, with the requests and summaries left out. */
export const boundariesOf = (sessions: readonly Session[]): Boundary[] =>
	sessions.flat().filter((item): item is Boundary => item.kind === "boundary");
