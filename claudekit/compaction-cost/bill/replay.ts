import { mean, money, OPUS } from "../price.ts";
import { type Session, sizeOf } from "../transcripts/transcripts.ts";
import { type Kept, keptOf, summaryOf } from "./fit.ts";

export interface Track {
	readonly first: number;
	readonly growths: readonly number[];
}

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

export interface Fixed {
	readonly writes: number;
	readonly out: number;
	readonly kept: Kept;
}

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

export interface Charged {
	readonly row: Row;
	readonly wasted: number;
	readonly together: number;
	readonly against: number;
	readonly breakEven: number;
}

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
