// What a compaction leaves behind, measured instead of assumed.
//
// A flat kept share is wrong away from the threshold that produced it: the context
// after a compaction is a fixed block, the system prompt and the tool schemas, plus
// a summary. A flat share of a small context would leave less than the summary
// alone needs, and a flat share of a large one would leave more than the engine
// ever wrote.
//
// Fitting `post` against `pre` by least squares does not work either, and that is
// worth stating: every real boundary fired at one threshold, so `pre` has almost no
// spread, and a line through it has no leverage. The first attempt returned a slope
// of 1.29 and an intercept of −274,470, which predicts a negative context.
//
// So the two parts are measured separately instead. The summary's size comes from
// the `isCompactSummary` record that follows each boundary, and the fixed block is
// what is left of `postTokens` once the summary is taken out.

import { CHARS_PER_TOKEN, type Session } from "../transcripts/transcripts.ts";
import type { Placed } from "../work/charge.ts";

/** What a compaction leaves behind, fitted over the real boundaries: a fixed block and a summary, both in tokens. */
export interface Kept {
	/** Tokens that survive whatever the context held: system prompt and tools. */
	readonly fixed: number;
	/** The summary's size as a share of the context it summarized. */
	readonly share: number;
	/** The summary's measured size in tokens, for the constant model. */
	readonly summary: number;
	/** Boundaries that carried a summary record, so that both parts are measured. */
	readonly rows: number;
	/**
	 * How the summary is assumed to behave away from the measured threshold.
	 * `proportional` scales it with the context, which favours a low threshold.
	 * `constant` holds it at its measured size, which favours a high one. The two
	 * bound the answer, because nothing in these rows says which is true.
	 */
	readonly mode: "proportional" | "constant";
}

/** The post-compaction size this model predicts for a context of `size`. */
export const keptOf = (kept: Kept, size: number): number =>
	Math.min(
		size,
		kept.fixed + (kept.mode === "constant" ? kept.summary : kept.share * size),
	);

/** The part of the kept context that the compacting turn had to write out. */
export const summaryOf = (kept: Kept, size: number): number =>
	Math.max(0, keptOf(kept, size) - kept.fixed);

/** Measure the fixed block and the summary over every boundary with a summary. */
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
				one.pre > 0 &&
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
		rows: pairs.length,
		mode,
	};
};

/** One context-size band of the cross table: the request count and mean edits per request, for requests early after a compaction and for steady ones. */
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

/**
 * The edit rate by context size and by distance from the last compaction at once.
 * Distance and size are collinear by construction, so this is the only free way to
 * ask which of the two the charge really tracks: read across a row for the effect
 * of a compaction at a fixed size, and down a column for the effect of size alone.
 * Requests before the first compaction of a session are left out of both arms, so
 * the comparison is within post-compaction work only.
 */
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
