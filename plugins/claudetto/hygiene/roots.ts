import { exists, readFile, realpath } from "node:fs/promises";
import { join, resolve, sep } from "node:path";

import { listedPaths, PURGE_PATHS } from "../hooks/command.run/useSetup/tools";

const within = (path: string, parent: string): boolean =>
	path === parent || path.startsWith(parent + sep);

export type Log = (message: string) => void;

/** A `catch` handler that logs `what` with the error and answers `fallback`. */
export const logged =
	<T>(log: Log, what: string, fallback: T) =>
	(error: unknown): T => {
		log(`${what} (${String(error)})`);
		return fallback;
	};

export const realOr = async (path: string, log: Log): Promise<string> => {
	try {
		return await realpath(path);
	} catch (error) {
		return logged(
			log,
			`The path ${path} was not resolved`,
			resolve(path),
		)(error);
	}
};

/** The `~/.claude` folder a real path is inside that hygiene never touches, or nothing. */
export const guardOf = (real: string, realHome: string) =>
	["projects", "plugins"].find((part) =>
		within(real, join(realHome, ".claude", part)),
	);

/** Why `root` must not be swept, or nothing. */
export const refusal = async (root: string, home: string, log: Log) => {
	const [real, realHome] = await Promise.all([
		realOr(root, log),
		realOr(home, log),
	]);
	if (real === realHome) {
		return "is the home folder";
	}
	const part = guardOf(real, realHome);
	return part === undefined ? undefined : `is inside ~/.claude/${part}`;
};

/** The session's project, each of Claude Code's `projects`, and each folder Mole's `purge_paths` lists, when hygiene may sweep it, by real path. */
export const trashRoots = async (
	cwd: string,
	projects: readonly string[],
	home: string,
	log: Log,
) => {
	const text = await readFile(join(home, PURGE_PATHS), "utf8").catch(
		logged(log, "The Mole purge paths were not read", ""),
	);
	const allowed = await Promise.all(
		[...projects, ...listedPaths(text, home)].map(async (dir) => {
			// Claude Code keeps a project in its list after its folder is gone.
			const real = await realpath(dir).catch(
				logged(log, `The root ${dir} was not resolved`, void 0),
			);
			return real === undefined ||
				(await refusal(real, home, log)) !== undefined
				? []
				: [real];
		}),
	);
	return [...new Set([await realOr(cwd, log), ...allowed.flat()])];
};

/** The folders of `dirs` that exist; each gone one is logged once, because every git call in it would fail. */
export const presentProjects = async (
	dirs: readonly string[],
	log: Log,
): Promise<string[]> => {
	const found = await Promise.all(dirs.map((dir) => exists(dir)));
	return dirs.filter((dir, i) => {
		if (found[i] !== true) {
			log(`The project folder ${dir} is gone, so the sweep skips it.`);
		}
		return found[i] === true;
	});
};
