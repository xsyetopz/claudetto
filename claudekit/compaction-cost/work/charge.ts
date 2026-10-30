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

export const EARLY_TURNS = 40;

export interface Placed {
	readonly request: Request;
	readonly explore: number;
	readonly edit: number;
	readonly since: number | undefined;
}

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

export interface Bucket {
	readonly label: string;
	readonly requests: number;
	readonly explore: number;
	readonly edit: number;
	readonly tools: number;
	readonly out: number;
}

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

export interface Charge {
	readonly early: number;
	readonly steady: number;
	readonly earlyRate: number;
	readonly steadyRate: number;
	readonly boundaries: number;
	readonly missingEdits: number;
	readonly editsPer: number;
	readonly turns: number;
}

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
