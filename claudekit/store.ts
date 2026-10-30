// The plugin's store on disk, shared by the slices of `claudekit/` that read what the in-tree plugin recorded.
// It sits beside `plugin.ts` because it is a seam of the same kind: one place that knows where the store lives,
// so a slice does not import another slice to reach it.
//
// A store key comes through `plugin.ts` and is never copied here, which is the rule that file's header states.
// A copied key is worse than a wrong one: the plugin renaming its key would leave every read here returning
// `undefined`, and a reader of `undefined` cannot tell an empty store from a key that no longer exists, so the
// weekly guard of the probe would switch itself off in silence. The two paths below are the store's own layout
// and not the plugin's, so they stay.

import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { LAST_KEY, readingOf } from "./plugin.ts";

/** Where a plugin loaded with `--plugin-dir` keeps its store, under the home folder. */
const STORE_DIR = ".claude/plugins/store";

/** The store files of the in-tree plugin. The name carries a hash of the folder it was loaded from. */
const STORE_NAME = "claudetto_inline-";

/** The parsed JSON of each store file of the in-tree plugin under `home`, oldest first; it throws when the store folder or a file is unreadable. */
export const storeFiles = async (home: string): Promise<unknown[]> => {
	const dir = path.join(home, STORE_DIR);
	const names = (await readdir(dir)).filter((n) => n.startsWith(STORE_NAME));
	const files = await Promise.all(
		names.map(async (n) => {
			const json: unknown = JSON.parse(
				await readFile(path.join(dir, n), "utf8"),
			);
			return { at: (await stat(path.join(dir, n))).mtimeMs, json };
		}),
	);
	return files.toSorted((l, r) => l.at - r.at).map((f) => f.json);
};

/** The value stored under `key` in a parsed store file, or `undefined` when the file is not an object or holds none. */
export const storedAt = (file: unknown, key: string): unknown =>
	typeof file === "object" && file !== null
		? Object.entries(file).find(([k]) => k === key)?.[1]
		: undefined;

/**
 * The seven-day used percent of the last reading in the in-tree plugin's store under `home`, or `undefined`.
 * It is `undefined` when there is no store folder, when no store holds a reading, and when the reading carries no
 * seven-day figure, so a caller can fall back on the dollar cap and never throws on a missing store.
 */
export const lastSevenDay = async (
	home: string,
): Promise<number | undefined> => {
	try {
		const files = await storeFiles(home);
		return files
			.map((f) => readingOf(storedAt(f, LAST_KEY))?.sevenDay)
			.findLast((v) => v !== undefined);
	} catch {
		return undefined;
	}
};
