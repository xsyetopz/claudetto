// The short values of env files, kept in the memory of the mod only because a short value falls to a brute force of its record fast.

import { ENV_PERSIST_MIN, ENV_VALUES_MAX } from "../../limits.ts";
import { type Entry, needlesOf } from "../domain/env.ts";

/** The values and the lines of a multiline value shorter than `ENV_PERSIST_MIN` that an env file held, by key and value, with the file that held them, for the life of the mod. The state never holds them. A value goes when its file still exists and no longer holds it, and stays when its file is gone. */
export const remembered = new Map<
	string,
	{ entry: Entry; path: string | undefined }
>();

/** The entries to keep in memory for `entries`: a value shorter than `ENV_PERSIST_MIN` and each line of a longer one that is shorter, when `needlesOf` would mask it. */
export const shortsOf = (entries: readonly Entry[]): Entry[] =>
	entries
		.flatMap(({ key, value }) => [
			{ key, value },
			...(value.includes("\n") ? value.split("\n") : []).map((l) => ({
				key,
				value: l.trim(),
			})),
		])
		.filter(
			(e) => e.value.length < ENV_PERSIST_MIN && needlesOf([e]).length > 0,
		);

/** Updates `remembered` with the short `shorts` of a scan: a value goes when its file is in `readable` and no longer holds it, and a new value is added up to `ENV_VALUES_MAX`. Gives whether the bound left a value out. */
export const rememberShorts = (
	shorts: readonly { entry: Entry; path: string | undefined }[],
	readable: ReadonlySet<string>,
): boolean => {
	const current = new Set(shorts.map(({ entry }) => idOf(entry)));
	for (const [id, { path }] of remembered) {
		if (path !== undefined && readable.has(path) && !current.has(id)) {
			remembered.delete(id);
		}
	}
	let isFull = false;
	for (const { entry, path } of shorts) {
		const id = idOf(entry);
		if (remembered.size < ENV_VALUES_MAX || remembered.has(id)) {
			remembered.set(id, { entry, path: remembered.get(id)?.path ?? path });
		} else {
			isFull = true;
		}
	}
	return isFull;
};

/** The key of an entry in `remembered`. */
const idOf = ({ key, value }: Entry): string => `${key}=${value}`;
