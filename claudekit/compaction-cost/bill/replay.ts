// Replay the real turn sequence against another compaction threshold.
//
// The growth each request added is measured, so the replay holds those growths and
// moves only the threshold. Three assumptions, stated in the page this builds:
// growth does not depend on the threshold, the kept share is the measured one, and
// the cache-write line is taken from the measurement rather than modelled, because
// the engine rewrites whole blocks and a model of it reads far too low.

import { mean, money, OPUS } from "../price.ts";
import { type Session, sizeOf } from "../transcripts/transcripts.ts";
import { type Kept, keptOf, summaryOf } from "./fit.ts";

/** One session as the replay sees it: a first prompt and what each turn added. */
export interface Track {
	readonly first: number;
	readonly growths: readonly number[];
}

/** The measured growth sequence of each session, with each compaction drop removed. */
export const tracksOf = (sessions: readonly Session[]): Track[] => {
	const tracks: Track[] = [];
	for (const items of sessions) {
		let first: number | undefined;
		let previous: number | undefined;
		const growths: number[] = [];
		for (const item of items) {
			if (item.kind === "boundary") {
				previous = undefined;
				continue;
			}
			if (item.kind !== "request") {
				continue;
			}
			const size = sizeOf(item);
			first ??= size;
			if (previous !== undefined) {
				growths.push(Math.max(0, size - previous));
			}
			previous = size;
		}
		if (first !== undefined) {
			tracks.push({ first, growths });
		}
	}
	return tracks;
};

/** One threshold replayed: its compaction count, the mean prompt in tokens, and the dollars of each billed line, with `billed` their sum. */
export interface Row {
	readonly threshold: number;
	readonly compactions: number;
	readonly meanPrompt: number;
	readonly reads: number;
	readonly writes: number;
	readonly out: number;
	readonly compacting: number;
	readonly billed: number;
}

/** The two bill lines the replay takes from the measurement instead of modelling, in dollars, and the kept model. */
export interface Fixed {
	/** The measured cache-write line, held at its measured value. */
	readonly writes: number;
	/** The measured output line, which the threshold does not touch. */
	readonly out: number;
	/** What a compaction leaves behind, fitted over the real boundaries. */
	readonly kept: Kept;
}

/** What these sessions would have been billed with the threshold at `threshold`. */
export const replay = (
	tracks: readonly Track[],
	threshold: number,
	fixed: Fixed,
): Row => {
	const sizes: number[] = [];
	let compactions = 0;
	let compacting = 0;
	for (const track of tracks) {
		let size = track.first;
		sizes.push(size);
		for (const growth of track.growths) {
			if (size + growth > threshold) {
				compactions += 1;
				// The compacting turn reads the whole context and writes out the
				// summary, which is the part of what it leaves that is new.
				compacting +=
					money(size, OPUS.read) + money(summaryOf(fixed.kept, size), OPUS.out);
				size = keptOf(fixed.kept, size);
			}
			size += growth;
			sizes.push(size);
		}
	}
	let reads = 0;
	for (const size of sizes) {
		reads += money(size, OPUS.read);
	}
	return {
		threshold,
		compactions,
		meanPrompt: mean(sizes),
		reads,
		writes: fixed.writes,
		out: fixed.out,
		compacting,
		billed: reads + fixed.writes + fixed.out + compacting,
	};
};

/** A replayed row with the lost-work charge in dollars; `against` is the percent change of the total versus the base row. */
export interface Charged {
	readonly row: Row;
	readonly wasted: number;
	readonly together: number;
	readonly against: number;
	/** Turns of lost work per compaction at which the base threshold would win. */
	readonly breakEven: number;
}

/**
 * The same rows with the measured lost-work charge applied: `turns` turns of work
 * per compaction, each worth `perTurn`. `base` is the threshold that actually ran,
 * so every row is read against it.
 */
export const withCharge = (
	rows: readonly Row[],
	options: { turns: number; perTurn: number; base: number },
): Charged[] => {
	const charge = options.turns * options.perTurn;
	const found = rows.find((row) => row.threshold === options.base);
	const base = found ?? rows[rows.length - 1];
	if (base === undefined) {
		return [];
	}
	const baseTotal = base.billed + base.compactions * charge;
	return rows.map((row) => {
		const wasted = row.compactions * charge;
		const together = row.billed + wasted;
		const extra = (row.compactions - base.compactions) * options.perTurn;
		return {
			row,
			wasted,
			together,
			against: (100 * (together - baseTotal)) / baseTotal,
			breakEven: extra === 0 ? 0 : (base.billed - row.billed) / extra,
		};
	});
};
