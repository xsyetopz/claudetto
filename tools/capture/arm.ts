// One arm of a capture: a `claude -p` run against a fake Messages API, read for the characters of its
// first request. This sits apart from `run.ts` because two commands read arms now, the reporting CLI
// and the inventory check of `inventory.ts`, and a reading is only comparable between them while both
// take it the same way.
//
// Each arm runs with an empty working folder, an empty config folder, and a fake API of its own,
// so no session, memory, or plugin of this machine reaches the reading and no two arms mix.

import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { cwd, env } from "node:process";
import { spawn } from "bun";
import { type FakeApi, startFakeApi } from "./fake-api.ts";
import { type Score, scoreOf } from "./score.ts";

/** The plugin folder of the new tree, loaded for the session only with `--plugin-dir`. */
const PLUGIN = "plugins/claudetto";

/** The prompt of the run. One word, so the message part is as small as a session allows. */
const PROMPT = "hi";

/** How long one `claude -p` run may take before the capture gives up. */
const RUN_MS = 120_000;

/**
 * The prefix of each run's folder. It is `/tmp` and not `tmpdir()` on purpose: the working folder
 * path is part of the request, because the environment block of the system prompt holds it, and a
 * reading taken under the macOS `TMPDIR` of `/var/folders/...` scores 132 characters higher than the
 * same reading under `/tmp`. A fixed prefix of a fixed length keeps two readings comparable on any
 * machine, and `mkdtemp` still picks the last six characters, so no other process can plant the
 * folder in advance.
 */
const TEMP_PREFIX = "/tmp/claudetto-capture-";

/** The two arms a reading can be taken from: the stock program, and the stock program with the plugin loaded. */
export const ARMS = ["plain", "plugin"] as const;

/** One of `ARMS`. */
export type Arm = (typeof ARMS)[number];

/** The outcome of one arm: its score, the count of messages and other requests, the exit code and stderr of the process; `score` is `undefined` when no messages request arrived. */
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

/** Runs `claude -p` once against `api`, in folders of its own. `settings` is the file's text. */
const runArm = async (options: {
	api: FakeApi;
	plugin: boolean;
	settings: string | undefined;
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
	const args = ["-p", PROMPT];
	if (options.plugin) {
		args.push("--plugin-dir", join(cwd(), PLUGIN));
	}
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

/**
 * One arm, end to end: its own fake API, one run, and the score of the first request. `dump` is a
 * folder to write that request's body into, re-indented from the raw text, since a body written
 * through `JSON.stringify` of the captured string would arrive as one escaped line.
 */
export const capture = async (
	arm: Arm,
	settings: string | undefined,
	dump?: string,
): Promise<Reading> => {
	const api = startFakeApi();
	try {
		const run = await runArm({ api, plugin: arm === "plugin", settings });
		const first = api.bodies[0];
		if (dump !== undefined && first !== undefined) {
			await writeFile(
				join(dump, `${arm}.json`),
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
