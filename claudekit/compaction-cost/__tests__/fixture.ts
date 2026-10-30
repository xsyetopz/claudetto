// A synthetic pair of session files for the tests of `claudekit/compaction-cost/`.
// Session one (project `proj-a`), prompt sizes in tokens:
//   100,000  150,000  200,000  | boundary pre 200,000 post 20,000 | summary 40,000 chars
//   30,000  50,000
// Session two (project `proj-b`):
//   50,000  100,000  | boundary pre 100,000 post 17,000 | summary 20,000 chars
//   25,000

import { mkdir, mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { write } from "bun";

/** A string that no loaded item may hold, because loading keeps no message text. */
export const MARKER = "SECRET-MARKER-9137";

/** An assistant record whose prompt is `size` tokens, all of it cache read. */
export const assistant = (size: number, tools: object[] = []): string =>
	JSON.stringify({
		type: "assistant",
		timestamp: "2026-10-28T10:00:00.000Z",
		message: {
			model: "claude-opus-5-5",
			content: [{ type: "text", text: MARKER }, ...tools],
			usage: {
				input_tokens: 0,
				cache_read_input_tokens: size,
				cache_creation_input_tokens: 0,
				output_tokens: 1000,
			},
		},
	});

export const boundary = (pre: number, post: number, trigger: string): string =>
	JSON.stringify({
		type: "system",
		subtype: "compact_boundary",
		compactMetadata: {
			trigger,
			preTokens: pre,
			postTokens: post,
			durationMs: trigger === "auto" ? 60_000 : 30_000,
		},
	});

/** A compaction summary whose content is `chars` characters long, led by the marker. */
export const summary = (chars: number): string =>
	JSON.stringify({
		type: "user",
		isCompactSummary: true,
		message: { role: "user", content: MARKER.padEnd(chars, "x") },
	});

export const readTool = (file: string): object => ({
	type: "tool_use",
	name: "Read",
	input: { file_path: file },
});

const SESSION_ONE = [
	assistant(100_000, [readTool("/a.ts")]),
	assistant(150_000),
	assistant(200_000),
	boundary(200_000, 20_000, "auto"),
	summary(40_000),
	assistant(30_000),
	assistant(50_000),
];

const SESSION_TWO = [
	assistant(50_000),
	assistant(100_000),
	boundary(100_000, 17_000, "manual"),
	summary(20_000),
	assistant(25_000),
];

const SESSION_PLAIN = [assistant(10_000), assistant(20_000)];

const put = async (
	root: string,
	project: string,
	name: string,
	lines: string[],
): Promise<void> => {
	await mkdir(path.join(root, project), { recursive: true });
	await write(path.join(root, project, name), `${lines.join("\n")}\n`);
};

/** Writes the two sessions, and a third without a compaction, under a new folder. */
export const writeFixture = async (): Promise<string> => {
	const root = await mkdtemp(path.join(os.tmpdir(), "compaction-cost-"));
	await put(root, "proj-a", "one.jsonl", SESSION_ONE);
	await put(root, "proj-b", "two.jsonl", SESSION_TWO);
	await put(root, "proj-c", "plain.jsonl", SESSION_PLAIN);
	return root;
};
