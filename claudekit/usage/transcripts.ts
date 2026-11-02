// Shared reading of Claude Code transcripts under `~/.claude/projects`.

import { homedir } from "node:os";
import { join } from "node:path";
import { file as bunFile, Glob } from "bun";

export const DEFAULT_ROOT = join(homedir(), ".claude", "projects");

export interface Window {
	readonly since: number;
	readonly until: number;
}

export interface Options {
	readonly root: string;
	readonly window: Window;
}

export type Entry = Record<string, unknown>;

export const isRecord = (value: unknown): value is Entry =>
	typeof value === "object" && value !== null && !Array.isArray(value);

export const numberOf = (value: unknown): number =>
	typeof value === "number" ? value : 0;

export const stringOf = (value: unknown): string | undefined =>
	typeof value === "string" ? value : undefined;

const flag = (argv: readonly string[], name: string): string | undefined => {
	const at = argv.indexOf(name);
	return at >= 0 ? argv[at + 1] : undefined;
};

const timeOf = (text: string | undefined, name: string): number => {
	const time = Date.parse(text ?? "");
	if (Number.isNaN(time)) {
		throw new Error(`${name} DATE is required, such as ${name} 2026-10-27`);
	}
	return time;
};

export const parseOptions = (argv: readonly string[]): Options => {
	const until = flag(argv, "--until");
	return {
		root: flag(argv, "--root") ?? DEFAULT_ROOT,
		window: {
			since: timeOf(flag(argv, "--since"), "--since"),
			until:
				until === undefined
					? Number.POSITIVE_INFINITY
					: timeOf(until, "--until"),
		},
	};
};

// A file last written before the week cannot hold a call from it.
export const transcriptFiles = async (
	root: string,
	since: number,
	subagents: boolean,
): Promise<string[]> => {
	const paths: string[] = [];
	for await (const name of new Glob("**/*.jsonl").scan({ cwd: root })) {
		const path = join(root, name);
		if (
			(subagents || !name.split("/").includes("subagents")) &&
			bunFile(path).lastModified >= since
		) {
			paths.push(path);
		}
	}
	return paths.sort((a, b) => a.localeCompare(b));
};

export const parseEntries = (text: string, needle?: string): Entry[] => {
	const entries: Entry[] = [];
	for (const line of text.split("\n")) {
		if (line === "" || (needle !== undefined && !line.includes(needle))) {
			continue;
		}
		try {
			const parsed: unknown = JSON.parse(line);
			if (isRecord(parsed)) {
				entries.push(parsed);
			}
		} catch {
			// A line cut off by a crash is not an entry.
		}
	}
	return entries;
};

export const readEntries = async (
	path: string,
	needle?: string,
): Promise<Entry[]> => parseEntries(await bunFile(path).text(), needle);

export interface Transcript {
	readonly path: string;
	readonly entries: Entry[];
}

const READ_AHEAD = 16;

interface Text {
	readonly path: string;
	readonly text: string;
}

const readText = async (path: string): Promise<Text> => ({
	path,
	text: await bunFile(path).text(),
});

const NOTHING: Promise<Text> = Promise.resolve({ path: "", text: "" });

// Reads run a few files ahead and the files are handed over in path order, so a response that two files hold
// (a resumed session copies its history) is always counted for the same file, and memory stays small.
export async function* transcripts(
	paths: readonly string[],
	needle?: string,
): AsyncGenerator<Transcript> {
	const queue: Promise<Text>[] = [];
	const start = (): void => {
		const path = paths[queue.length];
		if (path !== undefined) {
			queue.push(readText(path));
		}
	};
	for (let ahead = 0; ahead < READ_AHEAD; ahead += 1) {
		start();
	}
	let at = 0;
	for await (const { path, text } of queue) {
		queue[at] = NOTHING;
		at += 1;
		start();
		yield { path, entries: parseEntries(text, needle) };
	}
}

export interface Call {
	readonly key: string;
	readonly at: number;
	readonly model: string;
	readonly session: string;
	readonly sidechain: boolean;
	readonly input: number;
	readonly output: number;
	readonly read: number;
	readonly write: number;
	readonly prompt: number;
}

// The id pair names one API response, which the transcript repeats once per content block.
export const callOf = (entry: Entry): Call | undefined => {
	const message = entry["message"];
	const at = Date.parse(stringOf(entry["timestamp"]) ?? "");
	if (!isRecord(message) || !isRecord(message["usage"]) || Number.isNaN(at)) {
		return undefined;
	}
	const usage = message["usage"];
	const input = numberOf(usage["input_tokens"]);
	const read = numberOf(usage["cache_read_input_tokens"]);
	const write = numberOf(usage["cache_creation_input_tokens"]);
	return {
		key: `${stringOf(message["id"])}:${stringOf(entry["requestId"])}`,
		at,
		model: stringOf(message["model"]) ?? "?",
		session: stringOf(entry["sessionId"]) ?? "?",
		sidechain: entry["isSidechain"] === true,
		input,
		output: numberOf(usage["output_tokens"]),
		read,
		write,
		prompt: input + read + write,
	};
};

export const inWindow = (call: Call, window: Window): boolean =>
	call.at >= window.since && call.at < window.until;
