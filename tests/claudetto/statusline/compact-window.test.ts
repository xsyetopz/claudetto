// The context window in effect: the env var, then `modelSettings`, then the top-level `autoCompactWindow`, in the merged settings (local > project > user). A value that is not set keeps the window of the model.

import { expect, test } from "bun:test";
import type { FileReader } from "../../../plugins/claudetto/kernel/ports.ts";
import { main } from "../../../plugins/claudetto/modules/statusline/adapters/cli.ts";
import { depsFor, type Run, rowsOf } from "./support.ts";

const USER = "/home/user/.claude/settings.json";
const PROJECT = "/work/claudetto/.claude/settings.json";
const LOCAL = "/work/claudetto/.claude/settings.local.json";

const filesOf = (texts: Record<string, unknown>): FileReader => ({
	read: async (file) => (file in texts ? JSON.stringify(texts[file]) : null),
	list: async () => [],
});

const contextRow = async (
	model: string,
	texts: Record<string, unknown>,
	env: Record<string, string> = {},
) => {
	const { text } = await rowsOf(
		{
			model: { id: model },
			context_window: {
				total_input_tokens: 120_000,
				context_window_size: 1_000_000,
				used_percentage: 12,
			},
		},
		{
			env: { COLUMNS: "160", NO_COLOR: "1", ...env },
			files: filesOf(texts),
		},
	);
	return text;
};

const subagentRow = async (
	model: string,
	texts: Record<string, unknown>,
	env: Record<string, string> = {},
) => {
	const run: Run = { status: -1, out: [], err: [] };
	await main(
		["--subagent"],
		depsFor(
			{
				cwd: "/work/claudetto",
				columns: 100,
				tasks: [
					{
						id: "t1",
						name: "scout",
						status: "running",
						model,
						contextWindowSize: 1_000_000,
						tokenCount: 71_000,
					},
				],
			},
			run,
			{ env: { COLUMNS: "100", NO_COLOR: "1", ...env }, files: filesOf(texts) },
		),
	);
	const parsed: { content: string } = JSON.parse(run.out[0] ?? "{}");
	return parsed.content;
};

test("the top-level `autoCompactWindow` is the window of the main row, and the percent is of that window", async () => {
	const text = await contextRow("claude-opus-5-5", {
		[USER]: { autoCompactWindow: 300_000 },
	});
	expect(text).toContain("▤ ctx 40% of 300k");
});

test("the top-level window is also the window of a subagent row", async () => {
	const text = await subagentRow("claude-opus-5-5", {
		[USER]: { autoCompactWindow: 300_000 },
	});
	expect(text).toContain("▤ 71k/300k 24%");
});

test("a window in `modelSettings` wins over the top-level window for its model only", async () => {
	const texts = {
		[USER]: {
			autoCompactWindow: 300_000,
			modelSettings: { "claude-haiku-5-5": { autoCompactWindow: 132_000 } },
		},
	};
	expect(await contextRow("claude-haiku-5-5", texts)).toContain(
		"▤ ctx 91% of 132k",
	);
	expect(await contextRow("claude-opus-5-5", texts)).toContain(
		"▤ ctx 40% of 300k",
	);
	expect(await subagentRow("claude-haiku-5-5", texts)).toContain(
		"▤ 71k/132k 54%",
	);
});

test("`CLAUDE_CODE_AUTO_COMPACT_WINDOW` wins over both settings", async () => {
	const texts = {
		[USER]: {
			autoCompactWindow: 300_000,
			modelSettings: { "claude-opus-5-5": { autoCompactWindow: 200_000 } },
		},
	};
	const env = { CLAUDE_CODE_AUTO_COMPACT_WINDOW: "400000" };
	expect(await contextRow("claude-opus-5-5", texts, env)).toContain(
		"▤ ctx 30% of 400k",
	);
	expect(await subagentRow("claude-opus-5-5", texts, env)).toContain(
		"▤ 71k/400k 18%",
	);
});

test("`auto` and a missing value keep the window of the model", async () => {
	await Promise.all(
		[{ [USER]: { autoCompactWindow: "auto" } }, { [USER]: {} }, {}].map(
			async (texts) => {
				expect(await contextRow("claude-opus-5-5", texts)).toContain(
					"▤ ctx 12% of 1M",
				);
				expect(await subagentRow("claude-opus-5-5", texts)).toContain(
					"▤ 71k/1M 7%",
				);
			},
		),
	);
	expect(
		await contextRow(
			"claude-opus-5-5",
			{},
			{
				CLAUDE_CODE_AUTO_COMPACT_WINDOW: "auto",
			},
		),
	).toContain("▤ ctx 12% of 1M");
});

test("a window above the window of the model does not widen it", async () => {
	const { text } = await rowsOf(
		{
			context_window: {
				total_input_tokens: 60_000,
				context_window_size: 200_000,
				used_percentage: 30,
			},
		},
		{
			env: { COLUMNS: "160", NO_COLOR: "1" },
			files: filesOf({ [USER]: { autoCompactWindow: 500_000 } }),
		},
	);
	expect(text).toContain("▤ ctx 30% of 200k");
});

test("the local project file wins over the project file, and both win over the user file", async () => {
	const texts = {
		[USER]: { autoCompactWindow: 300_000 },
		[PROJECT]: { autoCompactWindow: 250_000 },
	};
	expect(await contextRow("claude-opus-5-5", texts)).toContain(
		"▤ ctx 48% of 250k",
	);
	expect(
		await contextRow("claude-opus-5-5", {
			...texts,
			[LOCAL]: { autoCompactWindow: 200_000 },
		}),
	).toContain("▤ ctx 60% of 200k");
	expect(
		await subagentRow("claude-opus-5-5", {
			...texts,
			[LOCAL]: { autoCompactWindow: 200_000 },
		}),
	).toContain("▤ 71k/200k 36%");
});

test("the tokens in use come from `current_usage` when it is there", async () => {
	const { text } = await rowsOf(
		{
			context_window: {
				context_window_size: 1_000_000,
				used_percentage: 5,
				current_usage: {
					input_tokens: 10_000,
					output_tokens: 3000,
					cache_creation_input_tokens: 20_000,
					cache_read_input_tokens: 90_000,
				},
			},
		},
		{
			env: { COLUMNS: "160", NO_COLOR: "1" },
			files: filesOf({ [USER]: { autoCompactWindow: 300_000 } }),
		},
	);
	expect(text).toContain("▤ ctx 40% of 300k");
});

test("the handoff mark counts from the same tokens in use", async () => {
	const text = await contextRow("claude-opus-5-5", {
		[USER]: { autoCompactWindow: 300_000 },
	});
	expect(text).toContain("40% of 300k ⇥47%");
});

test("the settings are read once for each run, not once for each row", async () => {
	const reads: string[] = [];
	const run: Run = { status: -1, out: [], err: [] };
	await main(
		["--subagent"],
		depsFor(
			{
				cwd: "/work/claudetto",
				tasks: [1, 2, 3].map((n) => ({
					id: `t${n}`,
					model: "claude-opus-5-5",
					tokenCount: 1000,
					contextWindowSize: 1_000_000,
				})),
			},
			run,
			{
				files: {
					read: async (file) => {
						reads.push(file);
						return null;
					},
					list: async () => [],
				},
			},
		),
	);
	expect(run.out).toHaveLength(3);
	expect(reads.filter((file) => file === USER)).toHaveLength(1);
});
