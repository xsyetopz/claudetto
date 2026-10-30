// What a compaction costs in work, measured on real sessions instead of assumed:
// the explore/edit mix by distance from the last compaction, and the lost-work charge
// that mix implies. The re-read arm is in `rereads.ts` and the descriptive readings in `stats.ts`.

import { mean } from "../price.ts";
import type { Request, Session } from "../transcripts/transcripts.ts";
import { countIn } from "./counts.ts";

const EXPLORE = new Set([
	"Read",
	"Grep",
	"Glob",
	"ToolSearch",
	"WebFetch",
	"WebSearch",
]);

const EDIT = new Set(["Edit", "Write", "NotebookEdit", "MultiEdit"]);

/** Requests closer than this to a compaction are the ones re-orienting. */
export const EARLY_TURNS = 40;

/** One request with how many turns stand between it and the last compaction. */
export interface Placed {
	readonly request: Request;
	readonly explore: number;
	readonly edit: number;
	/** None before the first compaction of the session. */
	readonly since: number | undefined;
}

/** Tags each request with its tool counts and the turns since the last compaction of its session, which is none before the first compaction. */
export const placeAll = (sessions: readonly Session[]): Placed[] => {
	const placed: Placed[] = [];
	for (const items of sessions) {
		let since: number | undefined;
		for (const item of items) {
			if (item.kind === "boundary") {
				since = 0;
				continue;
			}
			if (item.kind !== "request") {
				continue;
			}
			placed.push({
				request: item,
				explore: countIn(item.tools, EXPLORE),
				edit: countIn(item.tools, EDIT),
				since,
			});
			if (since !== undefined) {
				since += 1;
			}
		}
	}
	return placed;
};

/** The mean tool calls and output tokens per request over a group of requests, with the group's request count. */
export interface Bucket {
	readonly label: string;
	readonly requests: number;
	readonly explore: number;
	readonly edit: number;
	readonly tools: number;
	readonly out: number;
}

/** Averages the explore, edit, tool, and output counts of `rows` under `label`; an empty group gives zero means. */
export const bucketOf = (label: string, rows: readonly Placed[]): Bucket => ({
	label,
	requests: rows.length,
	explore: mean(rows.map((row) => row.explore)),
	edit: mean(rows.map((row) => row.edit)),
	tools: mean(rows.map((row) => row.request.tools.length)),
	out: mean(rows.map((row) => row.request.out)),
});

const RANGES: readonly (readonly [string, number, number])[] = [
	["first 5 turns", 0, 5],
	["turns 5 to 15", 5, 15],
	["turns 15 to 40", 15, 40],
	["turns 40 to 100", 40, 100],
	["turns 100 and on", 100, Number.POSITIVE_INFINITY],
];

/** The explore/edit mix by distance from the last compaction. */
export const orient = (placed: readonly Placed[]): Bucket[] => [
	...RANGES.map(([label, low, high]) =>
		bucketOf(
			label,
			placed.filter(
				(row) =>
					row.since !== undefined && row.since >= low && row.since < high,
			),
		),
	),
	bucketOf(
		"before the first compaction",
		placed.filter((row) => row.since === undefined),
	),
];

/** The lost-work charge: the edit rates per request early and steady, the edits missing across all compactions and per one, and the turns that is worth. */
export interface Charge {
	readonly early: number;
	readonly steady: number;
	readonly earlyRate: number;
	readonly steadyRate: number;
	readonly boundaries: number;
	readonly missingEdits: number;
	readonly editsPer: number;
	/** The charge: turns of steady-state work that one compaction costs. */
	readonly turns: number;
}

/**
 * The lost-work charge. The edit rate of the first `EARLY_TURNS` requests after a
 * compaction against the steady rate from there on gives the edits that did not
 * happen, which divided by the steady rate is the work lost per compaction.
 */
export const chargeOf = (
	placed: readonly Placed[],
	boundaries: number,
): Charge => {
	const after = placed.filter((row) => row.since !== undefined);
	const early = after.filter((row) => (row.since ?? 0) < EARLY_TURNS);
	const steady = after.filter((row) => (row.since ?? 0) >= EARLY_TURNS);
	const earlyRate = mean(early.map((row) => row.edit));
	const steadyRate = mean(steady.map((row) => row.edit));
	const missingEdits = (steadyRate - earlyRate) * early.length;
	const editsPer = boundaries === 0 ? 0 : missingEdits / boundaries;
	return {
		early: early.length,
		steady: steady.length,
		earlyRate,
		steadyRate,
		boundaries,
		missingEdits,
		editsPer,
		turns: steadyRate === 0 ? 0 : editsPer / steadyRate,
	};
};
