// The helpers that the tests share: the paths of the repository, a walk of a
// folder, and a temporary folder.
// A test file imports from here and keeps no copy of these helpers.

import { mkdtemp, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

/** The environment of a process, or of a child: each variable has a value or no value. */
export type Env = Record<string, string | undefined>;
/** The root of the repository. */
export const REPO = path.resolve(import.meta.dirname, "../..");
/** The folder that holds the plugins. */
export const PLUGINS = path.join(REPO, "plugins");

const SKIP = ["node_modules"];

/** The options of `walk`: the folder names to skip, and the test that selects a file. */
interface WalkOptions {
	skip?: string[];
	keep?: (file: string) => boolean;
}

/**
 * The files under `dir`, found at any depth, as full paths.
 * `skip` holds folder names that the walk does not enter.
 * `keep(file)` selects the files to return.
 * A folder that does not exist gives an empty list.
 */
export const walk = async (
	dir: string,
	{ skip = SKIP, keep = () => true }: WalkOptions = {},
): Promise<string[]> => {
	const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
	const found = await Promise.all(
		entries.map(async (entry) => {
			const full = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				return skip.includes(entry.name) ? [] : walk(full, { skip, keep });
			}
			return keep(full) ? [full] : [];
		}),
	);
	return found.flat();
};

/**
 * A new temporary folder whose name starts with `prefix`.
 * `tests/support/tmp-root.ts` moves the temporary folder of the process,
 * and it removes the folder at exit, so a test does not free it.
 */
export const tmpDir = (prefix: string): Promise<string> =>
	mkdtemp(path.join(os.tmpdir(), `${prefix}-`));
