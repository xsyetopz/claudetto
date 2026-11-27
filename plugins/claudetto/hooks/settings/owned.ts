import { stringsOf } from "../shared/field";
import { isRecord, type Json } from "./settings";

/** A scalar claudetto wrote, with the value it wrote, so a later release can take it back. */
export interface OwnedKey {
	readonly path: readonly string[];
	readonly value: unknown;
}

/** The scalar leaves of a settings object, each with its key path. */
export const leaves = (tree: Json, path: readonly string[] = []): OwnedKey[] =>
	Object.entries(tree).flatMap(([key, value]) => {
		if (isRecord(value)) {
			return leaves(value, [...path, key]);
		}
		return Array.isArray(value) ? [] : [{ path: [...path, key], value }];
	});

/**
 * Reads recorded keys back from the store. Anything malformed reads as no key,
 * because a corrupt record must not block the fill.
 */
export const readOwned = (value: unknown): OwnedKey[] =>
	Array.isArray(value)
		? value.flatMap((entry: unknown) => {
				const path = isRecord(entry) ? stringsOf(entry["path"]) : undefined;
				return isRecord(entry) && path !== undefined
					? [{ path, value: entry["value"] }]
					: [];
			})
		: [];

const valueAt = (tree: Json, path: readonly string[]): unknown => {
	let node: unknown = tree;
	for (const key of path) {
		node = isRecord(node) ? node[key] : undefined;
	}
	return node;
};

/** The tree without the value at `path`, and without each parent record that leaves empty. */
const without = (tree: Json, path: readonly string[]): Json => {
	const [key, ...rest] = path;
	if (key === undefined) {
		return tree;
	}
	const { [key]: child, ...others } = tree;
	if (rest.length === 0) {
		return others;
	}
	if (!isRecord(child)) {
		return tree;
	}
	const pruned = without(child, rest);
	return Object.keys(pruned).length === 0 ? others : { ...tree, [key]: pruned };
};

/**
 * Deletes each key an earlier fill recorded that the construction no longer names,
 * when the value is still the one claudetto wrote. A value the user changed since
 * is the user's now and stays.
 *
 * @param held Settings the user holds.
 * @param owned Keys the previous fill recorded.
 * @param named Keys the current construction names.
 * @param removed Receives one `removed <path>` line per deletion.
 * @returns The settings without the stale keys.
 */
export const removeStale = (
	held: Json,
	owned: readonly OwnedKey[],
	named: readonly OwnedKey[],
	removed: string[]
): Json => {
	const kept = new Set(named.map((leaf) => JSON.stringify(leaf.path)));
	let next = held;
	for (const { path, value } of owned) {
		if (!kept.has(JSON.stringify(path)) && valueAt(next, path) === value) {
			next = without(next, path);
			removed.push(`removed \`${path.join(".")}\``);
		}
	}
	return next;
};
