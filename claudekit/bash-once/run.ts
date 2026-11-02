// One `Bash` command in one `claude -p` session against the fake API, in a fresh scratch folder.

import { realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startFakeApi } from "../api/fake.ts";
import {
	claudeArgv,
	model,
	NO_SESSION_PERSISTENCE,
	outputFormat,
	print,
	settings as settingsPart,
} from "../session/argv.ts";
import { spawnCommand } from "../session/command.ts";
import { fakeApiEnv } from "../session/env.ts";
import { makeFolders } from "../session/folders.ts";
import { settingsWithHook, toolResultOf } from "./args.ts";

export interface Probe {
	readonly command: string;
	readonly settings: Record<string, unknown>;
	readonly hook?: string;
	readonly timeoutMs?: number;
}

const TIMEOUT_MS = 90_000;

/** What the CLI sent back as the `tool_result` of `command` under `settings`. The fake never calls a paid model. */
export const runBashOnce = async (probe: Probe): Promise<string> => {
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
		return toolResultOf(api.bodies[1]);
	} finally {
		await api.stop();
		await rm(folders.root, { recursive: true, force: true });
	}
};
