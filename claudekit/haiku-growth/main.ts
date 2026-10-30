// How much the prompt of a Haiku 5.5 response grows from one response to the next in this login's
// own transcripts, for checking the margin between the Haiku trigger and the price step against
// the growth one call can add. Free: it reads the transcripts and makes no model call.
//
//   bun claudekit/haiku-growth/main.ts [--root DIR]
//
// A response counts once, by `message.id`. Its prompt is the three input counts together, cache
// reads and writes included, because the price step counts them. Growth is taken only between two
// consecutive responses of one thread. A file interleaves the main thread with sidechains, so the
// thread of a response is the last link reached by following `parentUuid` through the file's own
// `uuid` map. A step down (a compaction) starts the series again rather than counting as negative
// growth.

import { homedir } from "node:os";
import { join } from "node:path";
import { file as bunFile, Glob } from "bun";
import {
	HAIKU_HANDOFF_TRIGGER_TOKENS,
	HAIKU_MODEL,
	HAIKU_PRICE_STEP,
} from "../plugin.ts";

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const count = (usage: Record<string, unknown>, key: string): number => {
	const value = usage[key];
	return typeof value === "number" ? value : 0;
};

interface Response {
	readonly id: string;
	readonly prompt: number;
	readonly uuid: string | undefined;
}

interface Entry {
	readonly uuid: string | undefined;
	readonly parent: string | undefined;
	readonly response: Response | undefined;
}

const stringOf = (value: unknown): string | undefined =>
	typeof value === "string" ? value : undefined;

/** The Haiku 5.5 response in a parsed line, or none. */
const responseOf = (parsed: Record<string, unknown>): Response | undefined => {
	const message = parsed["message"];
	if (!isRecord(message) || message["model"] !== HAIKU_MODEL) {
		return undefined;
	}
	const usage = message["usage"];
	const id = message["id"];
	if (!isRecord(usage) || typeof id !== "string") {
		return undefined;
	}
	return {
		id,
		uuid: stringOf(parsed["uuid"]),
		prompt:
			count(usage, "input_tokens") +
			count(usage, "cache_read_input_tokens") +
			count(usage, "cache_creation_input_tokens"),
	};
};

/** The links and the Haiku 5.5 response, if any, on one transcript line. */
const entryOf = (line: string): Entry | undefined => {
	let parsed: unknown;
	try {
		parsed = JSON.parse(line);
	} catch {
		return undefined;
	}
	if (!isRecord(parsed)) {
		return undefined;
	}
	return {
		uuid: stringOf(parsed["uuid"]),
		parent: stringOf(parsed["parentUuid"]),
		response: line.includes(HAIKU_MODEL) ? responseOf(parsed) : undefined,
	};
};

/** The last link reached by following `parentUuid` through the file's own `uuid` map. */
const rootOf = (
	uuid: string,
	parents: ReadonlyMap<string, string | undefined>,
): string => {
	const visited = new Set<string>([uuid]);
	let at = uuid;
	for (;;) {
		const parent = parents.get(at);
		if (parent === undefined || !parents.has(parent) || visited.has(parent)) {
			return at;
		}
		visited.add(parent);
		at = parent;
	}
};

/** The prompt-size growth read from the sessions: the response count, the prompt in tokens of each response, the step from each prompt to the next, and the sums of consecutive step pairs. */
export interface Growth {
	readonly responses: number;
	readonly steps: readonly number[];
	readonly pairs: readonly number[];
	readonly prompts: readonly number[];
}

/** The growth from each prompt to the next that is not smaller, and each pair of steps in a row. */
const stepsOf = (
	prompts: readonly number[],
): { steps: number[]; pairs: number[] } => {
	const steps: number[] = [];
	const pairs: number[] = [];
	let stepBefore: number | undefined;
	for (const [at, prompt] of prompts.entries()) {
		const before = prompts[at - 1];
		const step =
			before !== undefined && prompt >= before ? prompt - before : undefined;
		if (step !== undefined) {
			steps.push(step);
		}
		if (step !== undefined && stepBefore !== undefined) {
			pairs.push(step + stepBefore);
		}
		stepBefore = step;
	}
	return { steps, pairs };
};

/** The prompts of each thread of one file, in file order, skipping an id already seen. */
const threadsOf = (
	text: string,
	seen: Set<string>,
): ReadonlyMap<string, readonly number[]> => {
	const entries = text
		.split("\n")
		.map(entryOf)
		.filter((entry): entry is Entry => entry !== undefined);
	const parents = new Map<string, string | undefined>();
	for (const entry of entries) {
		if (entry.uuid !== undefined) {
			parents.set(entry.uuid, entry.parent);
		}
	}
	const threads = new Map<string, number[]>();
	for (const { response } of entries) {
		if (response === undefined || seen.has(response.id)) {
			continue;
		}
		seen.add(response.id);
		const key =
			response.uuid === undefined ? "" : rootOf(response.uuid, parents);
		threads.set(key, [...(threads.get(key) ?? []), response.prompt]);
	}
	return threads;
};

/** The growth between consecutive responses of each thread, after dropping a repeated id. */
export const growthOf = (transcripts: readonly string[]): Growth => {
	const seen = new Set<string>();
	const steps: number[] = [];
	const pairs: number[] = [];
	const prompts: number[] = [];
	for (const text of transcripts) {
		for (const own of threadsOf(text, seen).values()) {
			const grown = stepsOf(own);
			steps.push(...grown.steps);
			pairs.push(...grown.pairs);
			prompts.push(...own);
		}
	}
	return { responses: prompts.length, steps, pairs, prompts };
};

const largest = (values: readonly number[]): number => {
	let top = 0;
	for (const value of values) {
		top = Math.max(top, value);
	}
	return top;
};

const root = (): string => {
	const at = process.argv.indexOf("--root");
	return at >= 0 && process.argv[at + 1] !== undefined
		? (process.argv[at + 1] ?? "")
		: join(homedir(), ".claude", "projects");
};

const main = async (): Promise<void> => {
	const base = root();
	const names: string[] = [];
	for await (const name of new Glob("**/*.jsonl").scan({ cwd: base })) {
		names.push(name);
	}
	const texts = await Promise.all(
		names.map((name) => bunFile(join(base, name)).text()),
	);
	const growth = growthOf(texts);
	const margin = HAIKU_PRICE_STEP - HAIKU_HANDOFF_TRIGGER_TOKENS;
	const over = (values: readonly number[]): number =>
		values.filter((value) => value > margin).length;
	console.info(`transcripts: ${names.length}`);
	console.info(`responses: ${growth.responses}`);
	console.info(`margin below the price step: ${margin}`);
	console.info(
		`growth of one step: ${growth.steps.length} steps, largest ${largest(growth.steps)}, ${over(growth.steps)} over the margin`,
	);
	console.info(
		`growth of two steps in a row: ${growth.pairs.length} pairs, largest ${largest(growth.pairs)}, ${over(growth.pairs)} over the margin`,
	);
	console.info(
		`responses whose prompt was over ${HAIKU_PRICE_STEP}: ${growth.prompts.filter((prompt) => prompt > HAIKU_PRICE_STEP).length}`,
	);
};

if (import.meta.main) {
	await main();
}
