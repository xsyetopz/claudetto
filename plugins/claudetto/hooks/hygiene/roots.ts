import { readFile, realpath } from "node:fs/promises";
import { join, resolve, sep } from "node:path";

import { listedPaths, PURGE_PATHS } from "../setup/tools.ts";

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

export const realOr = (path: string, log: Log): Promise<string> =>
	realpath(path).catch(
		logged(log, `The path ${path} was not resolved`, resolve(path)),
	);

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

/** The session's project and each folder Mole's `purge_paths` lists that hygiene may sweep, by real path. */
export const trashRoots = async (cwd: string, home: string, log: Log) => {
	const text = await readFile(join(home, PURGE_PATHS), "utf8").catch(
		logged(log, "The Mole purge paths were not read", ""),
	);
	const allowed = await Promise.all(
		listedPaths(text, home).map(async (dir) =>
			(await refusal(dir, home, log)) === undefined
				? [await realOr(dir, log)]
				: [],
		),
	);
	return [...new Set([await realOr(cwd, log), ...allowed.flat()])];
};
