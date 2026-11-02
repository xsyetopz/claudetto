// How much of each main-thread prompt is read from cache, and why a request missed.

import {
	type Call,
	callOf,
	type Entry,
	inWindow,
	stringOf,
	transcriptFiles,
	transcripts,
	type Window,
} from "./transcripts.ts";

export interface Hits {
	n: number;
	hit95: number;
	hit50: number;
	miss: number;
	missWrite: number;
	allWrite: number;
	missesWithoutPrevious: number;
	missesAfterGap5m: number;
	missesAfterGap60m: number;
	/** Requests that follow a gap of more than 5 and up to 60 minutes, and how they read the cache. */
	midGaps: number;
	midGapHits: number;
	midGapMisses: number;
	gapsMinutes: number[];
}

// Below this a request is a title or a probe, not a turn of the conversation.
const MIN_PROMPT = 1000;
const FULL_SHARE = 0.95;
const HALF_SHARE = 0.5;
const MINUTE = 60_000;
const SHORT_TTL_MINUTES = 5;
const LONG_TTL_MINUTES = 60;

const isBoundary = (entry: Entry): boolean =>
	stringOf(entry["subtype"]) === "compact_boundary";

export const emptyHits = (): Hits => ({
	n: 0,
	hit95: 0,
	hit50: 0,
	miss: 0,
	missWrite: 0,
	allWrite: 0,
	missesWithoutPrevious: 0,
	missesAfterGap5m: 0,
	missesAfterGap60m: 0,
	midGaps: 0,
	midGapHits: 0,
	midGapMisses: 0,
	gapsMinutes: [],
});

const record = (hits: Hits, call: Call, previous: number | undefined): void => {
	hits.n += 1;
	hits.allWrite += call.write;
	const share = call.read / call.prompt;
	const gap =
		previous === undefined ? undefined : (call.at - previous) / MINUTE;
	const midGap =
		gap !== undefined && gap > SHORT_TTL_MINUTES && gap <= LONG_TTL_MINUTES;
	if (midGap) {
		hits.midGaps += 1;
		hits[share >= HALF_SHARE ? "midGapHits" : "midGapMisses"] += 1;
	}
	if (share >= FULL_SHARE) {
		hits.hit95 += 1;
	} else if (share >= HALF_SHARE) {
		hits.hit50 += 1;
	} else {
		hits.miss += 1;
		hits.missWrite += call.write;
		if (gap === undefined) {
			hits.missesWithoutPrevious += 1;
		} else {
			hits.gapsMinutes.push(gap);
		}
	}
};

const countable = (
	entry: Entry,
	window: Window,
	seen: Set<string>,
): Call | undefined => {
	const call = callOf(entry);
	if (
		call === undefined ||
		call.sidechain ||
		entry["type"] !== "assistant" ||
		!inWindow(call, window) ||
		seen.has(call.key)
	) {
		return undefined;
	}
	seen.add(call.key);
	return call.prompt < MIN_PROMPT ? undefined : call;
};

export const measureHits = async (
	root: string,
	window: Window,
): Promise<Hits> => {
	const hits = emptyHits();
	const seen = new Set<string>();
	const files = await transcriptFiles(root, window.since, false);
	for await (const { entries } of transcripts(files)) {
		let previous: number | undefined;
		let afterBoundary = false;
		for (const entry of entries) {
			if (isBoundary(entry)) {
				afterBoundary = true;
				continue;
			}
			const call = countable(entry, window, seen);
			if (call === undefined) {
				continue;
			}
			// The first request after a compaction has a new prefix by design.
			if (!afterBoundary) {
				record(hits, call, previous);
			}
			afterBoundary = false;
			previous = call.at;
		}
	}
	hits.gapsMinutes.sort((a, b) => a - b);
	hits.missesAfterGap5m = hits.gapsMinutes.filter((g) => g > 5).length;
	hits.missesAfterGap60m = hits.gapsMinutes.filter((g) => g > 60).length;
	return hits;
};

export const formatHit = (hits: Hits): string => {
	const share = hits.allWrite === 0 ? 0 : hits.missWrite / hits.allWrite;
	const median = hits.gapsMinutes[hits.gapsMinutes.length >> 1];
	const pct = (count: number): string =>
		hits.n === 0 ? "0.00" : ((100 * count) / hits.n).toFixed(2);
	return `requests ${hits.n}
read at least 95% from cache ${hits.hit95} (${pct(hits.hit95)}%)
read 50% to 95% ${hits.hit50} (${pct(hits.hit50)}%)
misses ${hits.miss} (${pct(hits.miss)}%), ${hits.missesWithoutPrevious} with no earlier request in the file
cache writes ${hits.allWrite}, in misses ${hits.missWrite}
miss share of cache writes ${share.toFixed(3)}
misses after a gap of more than 5 min ${hits.missesAfterGap5m}, more than 60 min ${hits.missesAfterGap60m}
requests after a gap of more than 5 and up to 60 min ${hits.midGaps}, hits ${hits.midGapHits}, misses ${hits.midGapMisses}
median gap before a miss ${median?.toFixed(1) ?? "none"} min`;
};
