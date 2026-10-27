// Runs `claudetto-setup` on a new folder that is the config folder and the project.

import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { file as bunFile, write } from "bun";
import { main } from "../../plugins/claudetto/modules/setup/adapters/cli.ts";
import { captureIo } from "./io.ts";

/** Runs `claudetto-setup` with `args` in `dir`, which is the config folder, the project, and the home folder, and gives the exit status and the printed text. */
export const runMain = async (dir: string, args: string[]) => {
	const { io, text } = captureIo();
	const env = { CLAUDE_CONFIG_DIR: dir, CLAUDE_PROJECT_DIR: dir, HOME: dir };
	const status = await main(args, env, dir, io);
	return { status, text: text() };
};

/**
 * Runs `claudetto-setup --scope <scope> --apply` in a new folder that holds `files` (text by path from the folder),
 * and gives the settings file after the run and the printed text.
 */
export const runSetup = async (
	files: Record<string, string>,
	scope = "user",
) => {
	const dir = await mkdtemp(path.join(os.tmpdir(), "setup-"));
	await Promise.all(
		Object.entries(files).map(([name, content]) =>
			write(path.join(dir, name), content),
		),
	);
	const { status, text } = await runMain(dir, ["--scope", scope, "--apply"]);
	if (status !== 0) {
		throw new Error(`claudetto-setup exited ${status}: ${text}`);
	}
	const file = scope === "user" ? "settings.json" : ".claude/settings.json";
	return { settings: await bunFile(path.join(dir, file)).json(), text };
};
