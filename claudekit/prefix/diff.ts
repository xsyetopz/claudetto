// The cache matches on the request prefix in the order tools, system, messages, so a change is named by the first block that differs.

import { objectOf, parsedOf } from "../api/json.ts";

/** What the second request does to the prefix of the first. */
export interface PrefixDiff {
	readonly kept: boolean;
	/** The first block that differs, such as `tools[3]`, or the top-level field when every block is kept. */
	readonly where?: string;
	/** The byte offset of that block in `tools`, `system`, `messages` serialized one after the other. */
	readonly offset?: number;
	/** Every top-level field that differs, such as `model` or `thinking`. */
	readonly fields?: readonly string[];
}

const BLOCK_FIELDS = new Set(["tools", "system", "messages"]);

/** Fields that are no prompt text: per-request ids, and the classifier context that only the first request carries. */
const IGNORED = new Set(["max_tokens", "stream", "metadata", "safeguards"]);

/** A marker names a place to cache and is no content, and it moves to the newest message each turn. */
const unmarked = (value: unknown): unknown => {
	if (Array.isArray(value)) {
		return value.map(unmarked);
	}
	if (typeof value === "object" && value !== null) {
		return Object.fromEntries(
			Object.entries(value)
				.filter(([key]) => key !== "cache_control")
				.map(([key, inner]) => [key, unmarked(inner)]),
		);
	}
	return value;
};

/** A string `content` and a list with that text as its one block are the same prompt. */
const blocked = (item: unknown): unknown => {
	const message = objectOf(item);
	return typeof message["content"] === "string"
		? { ...message, content: [{ type: "text", text: message["content"] }] }
		: item;
};

const listOf = (value: unknown): readonly string[] =>
	(Array.isArray(value) ? value : []).map((item) =>
		JSON.stringify(unmarked(blocked(item))),
	);

/**
 * Compares the prefix of `earlier` with the same part of `later`.
 * Messages only count up to the length of `earlier`, since a later turn appends.
 */
export const prefixDiff = (earlier: string, later: string): PrefixDiff => {
	const a = parsedOf(earlier);
	const b = parsedOf(later);
	let base = 0;
	for (const name of ["tools", "system", "messages"]) {
		const before = listOf(a[name]);
		const after = listOf(b[name]);
		const limit = name === "messages" ? before.length : after.length;
		const count = Math.max(before.length, limit);
		let offset = base + 1;
		for (let i = 0; i < count; i++) {
			if (before[i] !== after[i]) {
				return {
					kept: false,
					where: `${name}[${i}]`,
					offset,
					...fieldsOf(a, b),
				};
			}
			offset += (before[i]?.length ?? 0) + 1;
		}
		base += JSON.stringify(unmarked(a[name]) ?? []).length;
	}
	const fields = differing(a, b);
	if (fields.length === 0) {
		return { kept: true };
	}
	return { kept: false, where: fields[0] ?? "", fields };
};

const differing = (
	a: Record<string, unknown>,
	b: Record<string, unknown>,
): string[] =>
	[...new Set([...Object.keys(a), ...Object.keys(b)])].filter(
		(key) =>
			!(BLOCK_FIELDS.has(key) || IGNORED.has(key)) &&
			JSON.stringify(unmarked(a[key])) !== JSON.stringify(unmarked(b[key])),
	);

const fieldsOf = (
	a: Record<string, unknown>,
	b: Record<string, unknown>,
): { fields?: readonly string[] } => {
	const fields = differing(a, b);
	return fields.length === 0 ? {} : { fields };
};
