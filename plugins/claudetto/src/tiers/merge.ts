// The merge of a tier snippet into the settings the user already has. A value the user set and an
// option the user rejected stay, and each is listed as skipped.

import type { TierSnippet } from "./snippet.ts";

/** A parsed settings file: an object with keys of any value. */
export type Json = Record<string, unknown>;

/** Why a key of the snippet was not written. */
export type Why = "set" | "rejected";

/** A snippet value that `applyTier` put into the settings, at its path written with dots. */
export interface Written {
	readonly path: string;
	readonly value: unknown;
}

/** A snippet value that `applyTier` left out, at its path written with dots, with the reason. */
export interface Skipped {
	readonly path: string;
	readonly why: Why;
	/** What the snippet would have written. */
	readonly wanted: unknown;
	/** What the settings hold at the path, or none. */
	readonly kept?: unknown;
}

/** The result of `applyTier`: the merged settings, and what was written and skipped. A path that already held the snippet's own value is in neither list. */
export interface Applied {
	readonly settings: Json;
	readonly written: readonly Written[];
	readonly skipped: readonly Skipped[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

interface Leaf {
	readonly path: readonly string[];
	readonly value: unknown;
}

/**
 * Each leaf of the snippet with the keys that lead to it. A plain object is a branch, so the merge
 * decides one key of it at a time and a key the user set keeps its value. Everything else is a leaf,
 * a list among it: `permissions.deny` and the four `autoMode` lists are written or kept whole,
 * because half of a rule list is not a rule list.
 */
const leavesOf = (node: unknown, path: readonly string[] = []): Leaf[] =>
	isRecord(node)
		? Object.entries(node).flatMap(([key, child]) =>
				leavesOf(child, [...path, key]),
			)
		: [{ path, value: node }];

/** Whether the settings already hold what the snippet would write. A list compares entry by entry, since two equal lists are never the same object. */
const same = (had: unknown, value: unknown): boolean =>
	Array.isArray(had) && Array.isArray(value)
		? had.length === value.length &&
			value.every((entry, at) => had[at] === entry)
		: had === value;

const valueAt = (settings: unknown, path: readonly string[]): unknown => {
	let at = settings;
	for (const key of path) {
		if (!isRecord(at) || !Object.hasOwn(at, key)) {
			return undefined;
		}
		at = at[key];
	}
	return at;
};

/** A copy of `settings` with `value` at `path`, the objects on the way kept. */
const withValue = (
	settings: Json,
	path: readonly string[],
	value: unknown,
): Json => {
	const [key, ...rest] = path;
	if (key === undefined) {
		return settings;
	}
	if (rest.length === 0) {
		return { ...settings, [key]: value };
	}
	const child = settings[key];
	return {
		...settings,
		[key]: withValue(isRecord(child) ? child : {}, rest, value),
	};
};

/**
 * `snippet` merged into `current`. A path in `rejected`, written with dots such as
 * `env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`, is never written. A path that `current` already holds with
 * another value keeps that value. A path that holds the snippet's own value is not reported at all.
 */
export const applyTier = (
	current: Json,
	snippet: TierSnippet,
	rejected: readonly string[] = [],
): Applied => {
	let settings = current;
	const written: Written[] = [];
	const skipped: Skipped[] = [];
	for (const { path, value } of leavesOf(snippet)) {
		const dotted = path.join(".");
		const had = valueAt(current, path);
		if (rejected.includes(dotted)) {
			skipped.push({
				path: dotted,
				why: "rejected",
				wanted: value,
				...(had === undefined ? {} : { kept: had }),
			});
		} else if (had === undefined) {
			settings = withValue(settings, path, value);
			written.push({ path: dotted, value });
		} else if (!same(had, value)) {
			skipped.push({ path: dotted, why: "set", wanted: value, kept: had });
		}
	}
	return { settings, written, skipped };
};
