import type { TierSnippet } from "./snippet.ts";

export type Json = Record<string, unknown>;

export type Why = "set" | "rejected";

export interface Written {
	readonly path: string;
	readonly value: unknown;
}

export interface Skipped {
	readonly path: string;
	readonly why: Why;
	readonly wanted: unknown;
	readonly kept?: unknown;
}

export interface Applied {
	readonly settings: Json;
	readonly written: readonly Written[];
	readonly skipped: readonly Skipped[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

export const settingsText = (settings: Json): string =>
	`${JSON.stringify(settings, undefined, 2)}\n`;

interface Leaf {
	readonly path: readonly string[];
	readonly value: unknown;
}

const leavesOf = (node: unknown, path: readonly string[] = []): Leaf[] =>
	isRecord(node)
		? Object.entries(node).flatMap(([key, child]) =>
				leavesOf(child, [...path, key]),
			)
		: [{ path, value: node }];

const same = (had: unknown, value: unknown): boolean =>
	Array.isArray(had) && Array.isArray(value)
		? had.length === value.length &&
			value.every((entry, at) => had[at] === entry)
		: had === value;

const UNION = "permissions.deny";

const wantedAt = (dotted: string, had: unknown, value: unknown): unknown =>
	dotted === UNION && Array.isArray(had) && Array.isArray(value)
		? [...had, ...value.filter((rule) => !had.includes(rule))]
		: value;

const writes = (dotted: string, had: unknown, wanted: unknown): boolean =>
	had === undefined || (dotted === UNION && !same(had, wanted));

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
		const wanted = wantedAt(dotted, had, value);
		if (rejected.includes(dotted)) {
			skipped.push({
				path: dotted,
				why: "rejected",
				wanted: value,
				...(had === undefined ? {} : { kept: had }),
			});
		} else if (writes(dotted, had, wanted)) {
			settings = withValue(settings, path, wanted);
			written.push({ path: dotted, value: wanted });
		} else if (!same(had, wanted)) {
			skipped.push({ path: dotted, why: "set", wanted: value, kept: had });
		}
	}
	return { settings, written, skipped };
};
