import { realpath } from "node:fs/promises";
import { join, resolve, sep } from "node:path";

/** A root that hygiene refused, and why. */
export interface Refusal {
	readonly root: string;
	readonly reason: string;
}

const realOrResolved = (path: string): Promise<string> =>
	realpath(path).catch(() => resolve(path));

const within = (path: string, parent: string): boolean =>
	path === parent || path.startsWith(parent + sep);

/** Why `root` must not be swept: it is the home folder, or inside the project or plugin store of `~/.claude`. */
export const refusal = async (
	root: string,
	home: string,
): Promise<Refusal | undefined> => {
	const [real, realHome] = await Promise.all([
		realOrResolved(root),
		realOrResolved(home),
	]);
	if (real === realHome) {
		return { root, reason: "is the home folder" };
	}
	for (const part of ["projects", "plugins"]) {
		if (within(real, join(realHome, ".claude", part))) {
			return { root, reason: `is inside ~/.claude/${part}` };
		}
	}
	return undefined;
};
