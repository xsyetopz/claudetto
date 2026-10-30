// Each arm gets an empty working folder, config folder, and fake API, so no two arms mix.

import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { cwd } from "node:process";
import type { ToolCall } from "../../claudekit/api/answer.ts";
import { type FakeApi, startFakeApi } from "../../claudekit/api/fake.ts";
import { isClassifier } from "../../claudekit/api/match.ts";
import { claudeArgv, pluginDir, print } from "../../claudekit/session/argv.ts";
import { spawnCommand } from "../../claudekit/session/command.ts";
import { fakeApiEnv } from "../../claudekit/session/env.ts";
import { makeFolders } from "../../claudekit/session/folders.ts";
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

const runArm = async (options: {
	api: FakeApi;
	plugin: boolean;
	settings: string | undefined;
	prompt: string;
	extra: readonly string[];
}): Promise<{ code: number; stderr: string; work: string }> => {
	const { config, work } = await makeFolders(TEMP_PREFIX, options.settings);
	const ran = await spawnCommand(
		claudeArgv(
			print(options.prompt),
			options.plugin ? pluginDir(join(cwd(), PLUGIN)) : [],
			options.extra,
		),
		{
			cwd: work,
			env: fakeApiEnv(options.api.url, config),
			timeoutMs: RUN_MS,
		},
	);
	// A run that was killed or never started has no status; the report needs a number that is not 0.
	return { code: ran.code ?? 1, stderr: ran.stderr, work };
};

export interface CaptureOptions {
	readonly dump?: string | undefined;
	readonly prompt?: string;
	readonly extra?: readonly string[];
	/** Reads the auto mode classifier request in place of the first request. */
	readonly classifier?: boolean;
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
