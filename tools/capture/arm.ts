// Each arm gets an empty working folder, config folder, and fake API, so no two arms mix.

import { realpath, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { cwd } from "node:process";
import type { ToolCall } from "../../claudekit/api/answer.ts";
import { type FakeApi, startFakeApi } from "../../claudekit/api/fake.ts";
import { isClassifier } from "../../claudekit/api/match.ts";
import { claudeArgv, pluginDir, print } from "../../claudekit/session/argv.ts";
import { spawnCommand } from "../../claudekit/session/command.ts";
import { FAKE_KEY, fakeApiEnv } from "../../claudekit/session/env.ts";
import { makeFolders } from "../../claudekit/session/folders.ts";
import { interactiveConfig, runInTmux } from "../../claudekit/session/tmux.ts";
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
}): Promise<{ code: number; stderr: string; work: string }> => {
	const { root, config, work } = await makeFolders(
		TEMP_PREFIX,
		options.settings,
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
}

/** `dump` is re-indented from the raw text, since `JSON.stringify` of the string would be one line. */
export const capture = async (
	arm: Arm,
	settings: string | undefined,
	options: CaptureOptions = {},
): Promise<Reading> => {
	const api = startFakeApi(options.classifier ? CLASSIFIED_CALL : undefined);
	try {
		const run = await runArm({
			api,
			plugin: arm === "plugin",
			settings,
			prompt: options.prompt ?? PROMPT,
			interactive: options.interactive ?? false,
			extra: options.extra ?? [],
		});
		const first = options.classifier
			? api.bodies.find(isClassifier)
			: api.bodies[0];
		if (options.dump !== undefined && first !== undefined) {
			await writeFile(
				join(options.dump, `${arm}.json`),
				JSON.stringify(JSON.parse(first), undefined, 2),
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
