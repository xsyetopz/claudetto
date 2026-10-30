// How much of what a session reads after a point it had already read before it, measured at
// each compaction boundary and at random control points of the same sessions.

import type { Request, Session } from "../transcripts/transcripts.ts";
import { countIn } from "./counts.ts";

/** Turns counted after each point when looking for a re-read. */
const AFTER = 25;

/** A deterministic generator, so the control sample of a seed is reproducible. */
const generator = (seed: number): (() => number) => {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d_2b_79_f5) >>> 0;
		let drawn = Math.imul(state ^ (state >>> 15), 1 | state);
		drawn ^= drawn + Math.imul(drawn ^ (drawn >>> 7), 61 | drawn);
		return ((drawn ^ (drawn >>> 14)) >>> 0) / 4_294_967_296;
	};
};

const sample = <T>(
	from: readonly T[],
	want: number,
	next: () => number,
): T[] => {
	const pool = [...from];
	const taken: T[] = [];
	while (taken.length < want && pool.length > 0) {
		const index = Math.floor(next() * pool.length);
		taken.push(...pool.splice(index, 1));
	}
	return taken;
};

/** The re-read measure over a set of points: reads in the 25 turns after each point, those already read, their percent, and the points with any re-read. */
export interface Rereads {
	readonly points: number;
	readonly reads: number;
	readonly again: number;
	readonly share: number;
	readonly withAny: number;
}

/** The plain requests of a session, and the indices into them where a compaction fell. */
const splitOf = (items: Session): { plain: Request[]; marks: number[] } => {
	const plain: Request[] = [];
	const marks: number[] = [];
	for (const item of items) {
		switch (item.kind) {
			case "boundary":
				marks.push(plain.length);
				break;
			case "request":
				plain.push(item);
				break;
			default:
				break;
		}
	}
	return { plain, marks };
};

const atPoint = (
	plain: readonly Request[],
	at: number,
	lookback: number | undefined,
): { reads: number; again: number } => {
	const low = lookback === undefined ? 0 : Math.max(0, at - lookback);
	const seen = new Set<string>();
	for (const request of plain.slice(low, at)) {
		for (const path of request.paths) {
			seen.add(path);
		}
	}
	const after = plain.slice(at, at + AFTER).flatMap((request) => request.paths);
	return { reads: after.length, again: countIn(after, seen) };
};

/**
 * How much of what a session reads after a point it had already read before it.
 * `lookback` of none reaches the whole history. `controls` measures random points
 * of the same sessions instead of the compaction boundaries, as the control arm.
 */
export const rereads = (
	sessions: readonly Session[],
	lookback: number | undefined,
	options: { controls: boolean; seed: number; per: number },
): Rereads => {
	const next = generator(options.seed);
	let points = 0;
	let reads = 0;
	let again = 0;
	let withAny = 0;
	for (const items of sessions) {
		const { plain, marks } = splitOf(items);
		const free = [
			...new Array(Math.max(0, plain.length - AFTER)).keys(),
		].filter((index) => marks.every((mark) => Math.abs(index - mark) > AFTER));
		const at = options.controls
			? sample(free, marks.length * options.per, next)
			: marks;
		for (const point of at) {
			const got = atPoint(plain, point, lookback);
			points += 1;
			reads += got.reads;
			again += got.again;
			if (got.again > 0) {
				withAny += 1;
			}
		}
	}
	return {
		points,
		reads,
		again,
		share: reads === 0 ? 0 : (100 * again) / reads,
		withAny,
	};
};
