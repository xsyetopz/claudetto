// Each arm gets an empty working folder, config folder, and fake API, so no two arms mix.

import { mkdir, realpath, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { cwd } from "node:process";
import type { ToolCall } from "../../claudekit/api/answer.ts";
import { type FakeApi, startFakeApi } from "../../claudekit/api/fake.ts";
import { isClassifier } from "../../claudekit/api/match.ts";
import { claudeArgv, pluginDir, print } from "../../claudekit/session/argv.ts";
import { spawnCommand } from "../../claudekit/session/command.ts";
import { FAKE_KEY, fakeApiEnv } from "../../claudekit/session/env.ts";
import {
	type SessionFolders,
	withFolders,
} from "../../claudekit/session/folders.ts";
import { interactiveConfig, runInTmux } from "../../claudekit/session/tmux.ts";
import { claudeMdOf } from "./memory.ts";
import { type Score, scoreOf } from "./score.ts";

/** One word, so the message part is as small as a session allows. */
export const PROMPT = "hi";

const RUN_MS = 120_000;

/**
 * Auto mode allows a write inside the working folder without the classifier, so the call is a push.
 * The fake's `ok` is no verdict, so the classifier blocks the call, and in a folder with no repository it would fail anyway.
 */
const CLASSIFIED_CALL: ToolCall = {
	name: "Bash",
	input: { command: "git push origin main", description: "Push the branch" },
};

const PLUGIN = "plugins/claudetto";

/** `/tmp`, not `tmpdir()`: the folder path is in the request, so its length must be fixed. */
const TEMP_PREFIX = "/tmp/claudetto-capture-";

export const ARMS = ["plain", "plugin"] as const;

export type Arm = (typeof ARMS)[number];

export interface Reading {
	readonly arm: Arm;
	readonly score: Score | undefined;
	readonly requests: number;
	readonly others: number;
	readonly code: number;
	readonly stderr: string;
	/** The characters of the working folder path, which the request itself carries. */
	readonly workChars: number;
}

/** The `claude` words of one arm. An interactive arm gets its prompt typed in, so it has no `-p`. */
export const sessionArgv = (options: {
	plugin: string | undefined;
	prompt: string;
	interactive: boolean;
	extra: readonly string[];
}): string[] =>
	claudeArgv(
		options.interactive ? [] : print(options.prompt),
		options.plugin === undefined ? [] : pluginDir(options.plugin),
		options.extra,
	);

const runArm = async (options: {
	api: FakeApi;
	plugin: boolean;
	settings: string | undefined;
	prompt: string;
	interactive: boolean;
	extra: readonly string[];
	calls: number;
	tempPrefix: string;
	claudeMd: number | undefined;
	userClaudeMd: number | undefined;
	userFiles: readonly { path: string; text: string }[];
}): Promise<{ code: number; stderr: string; work: string }> =>
	// Only the exit status, the stderr, and the path length leave the root; the dump is written outside it.
	withFolders(options.tempPrefix, options.settings, (folders) =>
		runIn(folders, options),
	);

const runIn = async (
	{ root, config, work }: SessionFolders,
	options: {
		api: FakeApi;
		plugin: boolean;
		prompt: string;
		interactive: boolean;
		extra: readonly string[];
		claudeMd: number | undefined;
		userClaudeMd: number | undefined;
		userFiles: readonly { path: string; text: string }[];
	},
): Promise<{ code: number; stderr: string; work: string }> => {
	if (options.claudeMd !== undefined) {
		await writeFile(join(work, "CLAUDE.md"), claudeMdOf(options.claudeMd));
	}
	if (options.userClaudeMd !== undefined) {
		await writeFile(
			join(config, "CLAUDE.md"),
			claudeMdOf(options.userClaudeMd),
		);
	}
	await Promise.all(
		options.userFiles.map(async (file) => {
			const target = join(config, file.path);
			await mkdir(dirname(target), { recursive: true });
			await writeFile(target, file.text);
		}),
	);
	const argv = sessionArgv({
		...options,
		plugin: options.plugin ? join(cwd(), PLUGIN) : undefined,
	});
	const env = fakeApiEnv(options.api.url, config);
	if (options.interactive) {
		// The session names its folder by the real path, so that is the key its trust needs.
		const real = await realpath(work);
		await writeFile(
			join(config, ".claude.json"),
			interactiveConfig(real, FAKE_KEY),
		);
		const ran = await runInTmux({
			argv,
			cwd: work,
			env,
			socket: join(root, "tmux.sock"),
			prompt: options.prompt,
			done: () => options.api.bodies.length > 0,
			timeoutMs: RUN_MS,
		});
		return { code: ran.code, stderr: ran.stderr || ran.screen, work: real };
	}
	const ran = await spawnCommand(argv, { cwd: work, env, timeoutMs: RUN_MS });
	// A run that was killed or never started has no status; the report needs a number that is not 0.
	return { code: ran.code ?? 1, stderr: ran.stderr, work };
};

export interface CaptureOptions {
	readonly dump?: string | undefined;
	readonly prompt?: string;
	readonly extra?: readonly string[];
	/** Reads the auto mode classifier request in place of the first request. */
	readonly classifier?: boolean;
	/** Runs the session in `tmux` with no `-p`, so the tools of an interactive session are in the request. */
	readonly interactive?: boolean;
	/** The tool calls the fake answers with in turn, before it answers `ok`. */
	readonly calls?: readonly ToolCall[] | undefined;
	/** Lets a test keep its folders under `tmpdir()`, where a sandbox allows writes. */
	readonly tempPrefix?: string;
	/** The characters of a `CLAUDE.md` placed in the working folder; none when absent. */
	readonly claudeMd?: number | undefined;
	/** The characters of a `CLAUDE.md` placed in the config folder, as a user's own; none when absent. */
	readonly userClaudeMd?: number | undefined;
	/** Files written under the config folder at their relative paths, such as `rules/a.md`. */
	readonly userFiles?: readonly { path: string; text: string }[];
}

/** `dump` is re-indented from the raw text, since `JSON.stringify` of the string would be one line. */
export const capture = async (
	arm: Arm,
	settings: string | undefined,
	options: CaptureOptions = {},
): Promise<Reading> => {
	const api = startFakeApi(
		options.classifier ? CLASSIFIED_CALL : options.calls,
	);
	try {
		const run = await runArm({
			api,
			plugin: arm === "plugin",
			settings,
			prompt: options.prompt ?? PROMPT,
			interactive: options.interactive ?? false,
			extra: options.extra ?? [],
			calls: options.calls?.length ?? 0,
			tempPrefix: options.tempPrefix ?? TEMP_PREFIX,
			claudeMd: options.claudeMd,
			userClaudeMd: options.userClaudeMd,
			userFiles: options.userFiles ?? [],
		});
		const first = options.classifier
			? api.bodies.find(isClassifier)
			: api.bodies[0];
		if (options.dump !== undefined && first !== undefined) {
			await writeFile(
				join(options.dump, `${arm}.json`),
				JSON.stringify(JSON.parse(first), undefined, 2),
			);
			const dir = options.dump;
			await Promise.all(
				api.bodies
					.slice(1)
					.map((body, n) =>
						writeFile(
							join(dir, `${arm}.${n + 1}.json`),
							JSON.stringify(JSON.parse(body), undefined, 2),
						),
					),
			);
		}
		return {
			arm,
			score: first === undefined ? undefined : scoreOf(first),
			requests: api.bodies.length,
			others: api.others.length,
			code: run.code,
			stderr: run.stderr.trim(),
			workChars: run.work.length,
		};
	} finally {
		await api.stop();
	}
};
