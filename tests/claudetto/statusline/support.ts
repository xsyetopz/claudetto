// The fakes and fixtures of the tests of the `statusline` slice.

import path from "node:path";
import type { FileReader } from "../../../plugins/claudetto/kernel/ports.ts";
import type { Deps } from "../../../plugins/claudetto/modules/statusline/adapters/cli.ts";
import { paintOf } from "../../../plugins/claudetto/modules/statusline/color.ts";

// The clock of a limit prints local time, so the tests that print it fix the zone to UTC and do not depend on `TZ`.
process.env["TZ"] = "UTC";

/** A fixed clock: 2026-10-12T12:00:00Z in milliseconds. */
export const NOW = Date.UTC(2026, 9, 12, 12, 0, 0);

/** A `FileReader` with no file, so that no test reads the real temp folder or the real project. */
export const noFiles: FileReader = {
	read: async () => null,
	list: async () => [],
};

/** A fake of the files of a run: `write` stores the text, and `read` gives it back, or `null` for a missing file. */
export const memoryFiles = () => {
	const files = new Map<string, string>();
	return {
		files,
		reader: {
			read: async (file: string) => files.get(file) ?? null,
			list: async () => [],
		},
		write: async (file: string, text: string) => {
			files.set(file, text);
		},
	};
};

/** The status object of a session with every field that a segment reads. */
export const STATUS = {
	cwd: "/work/claudetto",
	model: { id: "claude-opus-5-5", display_name: "Opus 5.5" },
	workspace: { current_dir: "/work/claudetto", project_dir: "/work/claudetto" },
	cost: {
		total_cost_usd: 1.234,
		total_lines_added: 300,
		total_lines_removed: 20,
	},
	context_window: {
		total_input_tokens: 45_000,
		context_window_size: 300_000,
		used_percentage: 15,
	},
	effort: { level: "high" },
	thinking: { enabled: true },
	rate_limits: {
		five_hour: {
			used_percentage: 23,
			resets_at: NOW / 1000 + 3 * 3600 + 12 * 60,
		},
		seven_day: {
			used_percentage: 80,
			resets_at: NOW / 1000 + 2 * 86_400 + 4 * 3600,
		},
	},
};

/** The output of `git status --porcelain=v2 -b` for a dirty branch that is ahead and behind. */
export const GIT_TEXT = [
	"# branch.oid 1234567890abcdef",
	"# branch.head main",
	"# branch.upstream origin/main",
	"# branch.ab +1 -2",
	"1 .M N... 100644 100644 100644 aa bb a.ts",
	"? b.ts",
].join("\n");

/** The result of a run of the CLI. */
export interface Run {
	status: number;
	out: string[];
	err: string[];
}

/** The deps of `main` with fakes. `over` replaces any of them. */
export const depsFor = (
	input: unknown,
	run: Run,
	over: Partial<Deps> = {},
): Deps => ({
	stdin: async () =>
		typeof input === "string" ? input : JSON.stringify(input),
	env: { COLUMNS: "124" },
	now: () => NOW,
	cwd: "/work/claudetto",
	home: "/home/user",
	files: noFiles,
	write: async () => undefined,
	limitsFile: (configDir) => path.join(configDir, "claudetto", "limits.json"),
	runner: {
		run: async () => ({ exitCode: 0, stdout: GIT_TEXT, stderr: "" }),
	},
	log: (line) => run.out.push(line),
	error: (text) => run.err.push(text),
	...over,
});

/** The run of `main` with no arguments on `input`, with the fakes of `depsFor` and `over`. */
export const runMain = async (
	input: unknown,
	over: Partial<Deps> = {},
): Promise<Run> => {
	const run: Run = { status: -1, out: [], err: [] };
	const { main } = await import(
		"../../../plugins/claudetto/modules/statusline/adapters/cli.ts"
	);
	run.status = await main([], depsFor(input, run, over));
	return run;
};

/** The rows of the main status line for `input` at `columns`, with the color off. */
export const plainRows = async (
	input: unknown,
	columns: number,
): Promise<string[]> =>
	(await outputOf(input, { COLUMNS: String(columns), NO_COLOR: "1" })).split(
		"\n",
	);

/** The output of `main` for `input`, at 200 columns unless `env` sets `COLUMNS`, with `env` added and the deps of `over`. */
export const outputOf = async (
	input: unknown,
	env: Record<string, string> = { NO_COLOR: "1" },
	over: Partial<Deps> = {},
): Promise<string> =>
	(await runMain(input, { env: { COLUMNS: "200", ...env }, ...over })).out.join(
		"\n",
	);

/** The styles with color, and the styles with no color. */
export const DARK = paintOf(true);
export const NO_COLOR = paintOf(false);

/** The rows of one run of `main` on `STATUS` with `patch` merged in, with the env and the deps of `over`. */
export const rowsOf = async (
	patch: Record<string, unknown>,
	over: Partial<Deps> = {},
): Promise<{ text: string; run: Run }> => {
	const run: Run = { status: -1, out: [], err: [] };
	const { main } = await import(
		"../../../plugins/claudetto/modules/statusline/adapters/cli.ts"
	);
	run.status = await main(
		[],
		depsFor({ ...STATUS, ...patch }, run, {
			env: { COLUMNS: "160", NO_COLOR: "1" },
			...over,
		}),
	);
	return { text: run.out.join("\n"), run };
};
