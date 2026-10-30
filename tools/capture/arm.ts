// Each arm gets an empty working folder, config folder, and fake API, so no two arms mix.

import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { cwd, env } from "node:process";
import { spawn } from "bun";
import { type FakeApi, startFakeApi, type ToolCall } from "./fake-api.ts";
import { isClassifier, type Score, scoreOf } from "./score.ts";

const PLUGIN = "plugins/claudetto";

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
	const root = await mkdtemp(TEMP_PREFIX);
	const config = join(root, "config");
	const work = join(root, "work");
	await Promise.all([
		mkdir(config, { recursive: true }),
		mkdir(work, { recursive: true }),
	]);
	if (options.settings !== undefined) {
		await writeFile(join(config, "settings.json"), options.settings);
	}
	const args = ["-p", options.prompt];
	if (options.plugin) {
		args.push("--plugin-dir", join(cwd(), PLUGIN));
	}
	args.push(...options.extra);
	const child = spawn(["claude", ...args], {
		cwd: work,
		env: {
			...env,
			ANTHROPIC_BASE_URL: options.api.url,
			ANTHROPIC_API_KEY: "sk-ant-fake",
			CLAUDE_CONFIG_DIR: config,
			DISABLE_TELEMETRY: "1",
			DISABLE_ERROR_REPORTING: "1",
			DISABLE_AUTOUPDATER: "1",
		},
		stdin: "ignore",
		stdout: "pipe",
		stderr: "pipe",
	});
	// A run that hangs is killed, and the kill makes `exited` resolve, so there is no race to lose.
	const timer = setTimeout(() => child.kill(), RUN_MS);
	const code = await child.exited;
	clearTimeout(timer);
	return { code, stderr: await new Response(child.stderr).text(), work };
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
