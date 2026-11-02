import {
	CHARS_PER_TOKEN,
	type Request,
	type Session,
} from "../transcripts/transcripts.ts";
import type { Placed } from "../work/charge.ts";

export interface Kept {
	readonly fixed: number;
	readonly share: number;
	readonly summary: number;
	/** Mean tokens the first request after a boundary wrote to the cache: the new prefix is a miss. */
	readonly write: number;
	/** All such tokens in the sessions, which the fixed write total already holds. */
	readonly written: number;
	/** Boundaries that carried a summary record, so that both parts are measured. */
	readonly rows: number;
	/** `proportional` favours a low threshold and `constant` a high one; the two bound the answer. */
	readonly mode: "proportional" | "constant";
}

export const keptOf = (kept: Kept, size: number): number =>
	Math.min(
		size,
		kept.fixed + (kept.mode === "constant" ? kept.summary : kept.share * size),
	);

export const summaryOf = (kept: Kept, size: number): number =>
	Math.max(0, keptOf(kept, size) - kept.fixed);

const requestAfter = (items: Session, index: number): Request | undefined => {
	const found = items.slice(index + 1).find((item) => item.kind === "request");
	return found?.kind === "request" ? found : undefined;
};

const writtenAfter = (
	sessions: readonly Session[],
): { tokens: number; count: number } => {
	let tokens = 0;
	let count = 0;
	for (const items of sessions) {
		for (const [index, one] of items.entries()) {
			const after =
				one.kind === "boundary" ? requestAfter(items, index) : undefined;
			if (after !== undefined) {
				tokens += after.write;
				count += 1;
			}
		}
	}
	return { tokens, count };
};

export const measureKept = (
	sessions: readonly Session[],
	mode: Kept["mode"],
): Kept => {
	const pairs: { pre: number; post: number; summary: number }[] = [];
	for (const items of sessions) {
		for (let index = 0; index < items.length; index += 1) {
			const one = items[index];
			const next = items[index + 1];
			if (
				one?.kind === "boundary" &&
				next?.kind === "summary" &&
				one.pre >= one.post &&
				one.post > 0
			) {
				pairs.push({
					pre: one.pre,
					post: one.post,
					summary: next.chars / CHARS_PER_TOKEN,
				});
			}
		}
	}
	const after = writtenAfter(sessions);
	let fixed = 0;
	let share = 0;
	let summary = 0;
	for (const pair of pairs) {
		fixed += pair.post - pair.summary;
		share += pair.summary / pair.pre;
		summary += pair.summary;
	}
	const count = pairs.length || 1;
	return {
		fixed: fixed / count,
		share: share / count,
		summary: summary / count,
		write: after.count === 0 ? 0 : after.tokens / after.count,
		written: after.tokens,
		rows: pairs.length,
		mode,
	};
};

export interface Cell {
	readonly label: string;
	readonly early: { requests: number; edit: number };
	readonly steady: { requests: number; edit: number };
}

const SIZES: readonly (readonly [string, number, number])[] = [
	["under 60k", 0, 60_000],
	["60k to 100k", 60_000, 100_000],
	["100k to 140k", 100_000, 140_000],
	["140k to 180k", 140_000, 180_000],
	["180k and over", 180_000, Number.POSITIVE_INFINITY],
];

const rate = (rows: readonly Placed[]): { requests: number; edit: number } => {
	let edits = 0;
	for (const row of rows) {
		edits += row.edit;
	}
	return {
		requests: rows.length,
		edit: rows.length === 0 ? 0 : edits / rows.length,
	};
};

/** Edit rate by size and by distance at once, because the two are collinear by construction. */
export const crossTable = (
	placed: readonly Placed[],
	early: number,
	sizeOfRequest: (row: Placed) => number,
): Cell[] =>
	SIZES.map(([label, low, high]) => {
		const inBucket = placed.filter((row) => {
			const size = sizeOfRequest(row);
			return row.since !== undefined && size >= low && size < high;
		});
		return {
			label,
			early: rate(inBucket.filter((row) => (row.since ?? 0) < early)),
			steady: rate(inBucket.filter((row) => (row.since ?? 0) >= early)),
		};
	});
