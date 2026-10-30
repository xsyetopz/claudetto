import { homedir } from "node:os";
import { join } from "node:path";
import { file as bunFile, Glob } from "bun";

const SKIP = "claudetto-probe";

const READERS = new Set(["Read", "Edit", "Write", "NotebookEdit", "MultiEdit"]);

export const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const num = (value: unknown): number => (typeof value === "number" ? value : 0);

const str = (value: unknown): string =>
	typeof value === "string" ? value : "";

export interface Request {
	readonly kind: "request";
	readonly fresh: number;
	readonly read: number;
	readonly write: number;
	readonly out: number;
	readonly model: string;
	readonly at: number;
	readonly tools: readonly string[];
	readonly paths: readonly string[];
}

export interface Boundary {
	readonly kind: "boundary";
	readonly trigger: string;
	readonly pre: number;
	readonly post: number;
	readonly ms: number;
}

export interface Summary {
	readonly kind: "summary";
	readonly chars: number;
}

export type Item = Request | Boundary | Summary;

/** Tokens per character: the transcript records no `usage` for the summarizer request. */
export const CHARS_PER_TOKEN = 4;

export type Session = readonly Item[];

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

export const requestsOf = (sessions: readonly Session[]): Request[] =>
	sessions.flat().filter((item): item is Request => item.kind === "request");

export const boundariesOf = (sessions: readonly Session[]): Boundary[] =>
	sessions.flat().filter((item): item is Boundary => item.kind === "boundary");
