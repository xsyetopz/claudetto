// Reads a run's request bodies as a chain, one line each and the prefix change between neighbours.

import { fieldOf, parsedOf } from "../api/json.ts";
import { type PrefixDiff, prefixDiff } from "./diff.ts";

/** The main thread of a session streams its answer and lists tools; a title or a classifier request does not. */
export const isMain = (raw: string): boolean => {
	const body = parsedOf(raw);
	const tools = body["tools"];
	return body["stream"] === true && Array.isArray(tools) && tools.length > 0;
};

const lengthOf = (value: unknown): number =>
	Array.isArray(value) ? value.length : 0;

/** The shape of one request in a line, with the count of its `cache_control` markers. */
export const lineOf = (raw: string): string => {
	const body = parsedOf(raw);
	const markers = raw.match(/"cache_control"/g)?.length ?? 0;
	const system = fieldOf(body, "system");
	return [
		`model=${String(body["model"])}`,
		`tools=${lengthOf(body["tools"])}`,
		`system=${typeof system === "string" ? 1 : lengthOf(system)}`,
		`messages=${lengthOf(body["messages"])}`,
		`markers=${markers}`,
	].join(" ");
};

export interface Pair {
	readonly diff: PrefixDiff;
	/** Each differing top-level field as `name: before -> after`. */
	readonly values: readonly string[];
}

/** Each request compared with the one before it. */
export const pairsOf = (raws: readonly string[]): Pair[] =>
	raws.slice(1).map((raw, at) => {
		const before = raws[at] ?? "";
		const diff = prefixDiff(before, raw);
		const a = parsedOf(before);
		const b = parsedOf(raw);
		const values = (diff.fields ?? []).map(
			(name) =>
				`${name}: ${JSON.stringify(a[name]).slice(0, 80)} -> ${JSON.stringify(b[name]).slice(0, 80)}`,
		);
		return { diff, values };
	});
