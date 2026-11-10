import { readFile, realpath } from "node:fs/promises";
import { join, resolve, sep } from "node:path";

import { listedPaths, PURGE_PATHS } from "../setup/tools.ts";

const within = (path: string, parent: string): boolean =>
	path === parent || path.startsWith(parent + sep);

export const realOr = (path: string): Promise<string> =>
	realpath(path).catch(() => resolve(path));

/** The `~/.claude` folder a real path is inside that hygiene never touches, or nothing. */
export const guardOf = (real: string, realHome: string) =>
	["projects", "plugins"].find((part) =>
		within(real, join(realHome, ".claude", part)),
	);

/** Why `root` must not be swept, or nothing. */
export const refusal = async (root: string, home: string) => {
	const [real, realHome] = await Promise.all([realOr(root), realOr(home)]);
	if (real === realHome) {
		return "is the home folder";
	}
	const part = guardOf(real, realHome);
	return part === undefined ? undefined : `is inside ~/.claude/${part}`;
};

/** The session's project and each folder Mole's `purge_paths` lists that hygiene may sweep, by real path. */
export const trashRoots = async (cwd: string, home: string) => {
	const text = await readFile(join(home, PURGE_PATHS), "utf8").catch(() => "");
	const allowed = await Promise.all(
		listedPaths(text, home).map(async (dir) =>
			(await refusal(dir, home)) === undefined ? [await realOr(dir)] : [],
		),
	);
	return [...new Set([await realOr(cwd), ...allowed.flat()])];
};
