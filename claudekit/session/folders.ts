// The folders a session runs in: a fresh root with an empty config folder and an empty working folder.

import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";

/** The three folders `makeFolders` creates, all under one temporary root. */
export interface SessionFolders {
	readonly root: string;
	/** Holds `settings.json` when one is given, and becomes `CLAUDE_CONFIG_DIR`. */
	readonly config: string;
	/** The working folder of the session. */
	readonly work: string;
}

/**
 * Creates `root`, `config`, and `work` under a folder that `mkdtemp` picks from `prefix`. A caller that
 * needs a path of a fixed length passes a prefix under `/tmp`, since `tmpdir()` differs between machines.
 * `settings` is the text of the user-level `settings.json` to write into `config`.
 */
export const makeFolders = async (
	prefix: string,
	settings?: string,
): Promise<SessionFolders> => {
	const root = await mkdtemp(prefix);
	const config = join(root, "config");
	const work = join(root, "work");
	await Promise.all([
		mkdir(config, { recursive: true }),
		mkdir(work, { recursive: true }),
	]);
	if (settings !== undefined) {
		await writeFile(join(config, "settings.json"), settings);
	}
	return { root, config, work };
};
