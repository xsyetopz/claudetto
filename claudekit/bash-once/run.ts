// One `Bash` command in one `claude -p` session against the fake API, in a fresh scratch folder.

import { realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startFakeApi } from "../api/fake.ts";
import { isClassifier } from "../api/match.ts";
import {
	claudeArgv,
	model,
	NO_SESSION_PERSISTENCE,
	outputFormat,
	type Part,
	permissionMode,
	pluginDir,
	print,
	settings as settingsPart,
} from "../session/argv.ts";
import { spawnCommand } from "../session/command.ts";
import { fakeApiEnv } from "../session/env.ts";
import { makeFolders } from "../session/folders.ts";
import { classifierSaw, settingsWithHook, toolResultOf } from "./args.ts";

export interface Probe {
	readonly command: string;
	readonly settings: Record<string, unknown>;
	readonly hook?: string;
	readonly timeoutMs?: number;
	/** A plugin folder to load with `--plugin-dir`. */
	readonly pluginDir?: string;
	/** The `--permission-mode` of the session. */
	readonly permissionMode?: string;
}

export interface Capture {
	readonly result: string;
	/** How many requests the auto mode classifier made. */
	readonly classifierRequests: number;
	/** How many of them carry the command the model wrote. */
	readonly classifierSawCommand: number;
}

const TIMEOUT_MS = 90_000;

const optional = (part: Part | undefined): Part => part ?? [];

/** What the CLI sent back as the `tool_result` of `command` under `settings`. The fake never calls a paid model. */
export const runBashOnce = async (probe: Probe): Promise<string> =>
	(await captureBashOnce(probe)).result;

/** `runBashOnce` plus the classifier requests that the session made and whether they carried the command. */
export const captureBashOnce = async (probe: Probe): Promise<Capture> => {
	const folders = await makeFolders(join(tmpdir(), "bash-once-"));
	const api = startFakeApi({
		name: "Bash",
		input: { command: probe.command, description: "probe" },
	});
	try {
		const settings =
			probe.hook === undefined
				? probe.settings
				: settingsWithHook(probe.settings, probe.hook);
		const done = await spawnCommand(
			claudeArgv(
				print("Run the probe."),
				model("claude-sonnet-5-5"),
				settingsPart(settings),
				optional(
					probe.pluginDir === undefined
						? undefined
						: pluginDir(probe.pluginDir),
				),
				optional(
					probe.permissionMode === undefined
						? undefined
						: permissionMode(probe.permissionMode),
				),
				outputFormat("json"),
				NO_SESSION_PERSISTENCE,
			),
			{
				cwd: await realpath(folders.work),
				env: fakeApiEnv(api.url, folders.config),
				timeoutMs: probe.timeoutMs ?? TIMEOUT_MS,
			},
		);
		if (done.timedOut) {
			throw new Error("`claude` timed out");
		}
		const classifier = api.bodies.filter(isClassifier);
		return {
			result: toolResultOf(api.bodies.filter((b) => !isClassifier(b)).at(-1)),
			classifierRequests: classifier.length,
			classifierSawCommand: classifierSaw(classifier, probe.command),
		};
	} finally {
		await api.stop();
		await rm(folders.root, { recursive: true, force: true });
	}
};
