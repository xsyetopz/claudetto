// Printing only: the tables about the work a compaction costs, which the bill does not show.

import type { Gaps } from "../transcripts/stats.ts";
import type { Bucket, Charge } from "../work/charge.ts";
import type { Rereads } from "../work/rereads.ts";
import { head, line, pad, usd, whole } from "./format.ts";

/** Prints the mean explore and edit tool calls per request in each band of distance from the last compaction. */
export const orientTable = (buckets: readonly Bucket[]): void => {
	head("The explore/edit mix by distance from the last compaction");
	line([
		pad("bucket", 27),
		pad("reqs", 5),
		pad("explore", 7),
		pad("edits", 6),
		pad("ratio", 6),
		pad("tools", 6),
		pad("output", 6),
	]);
	for (const bucket of buckets) {
		line([
			pad(bucket.label, 27),
			pad(String(bucket.requests), 5),
			pad(bucket.explore.toFixed(3), 7),
			pad(bucket.edit.toFixed(3), 6),
			pad(
				bucket.edit === 0 ? "-" : (bucket.explore / bucket.edit).toFixed(2),
				6,
			),
			pad(bucket.tools.toFixed(3), 6),
			pad(whole(bucket.out), 6),
		]);
	}
};

/** Prints the edit rates early and steady, the edits missing per compaction, and that loss in turns and dollars at `perTurn`. */
export const chargeBlock = (
	charge: Charge,
	perTurn: number,
	earlyTurns: number,
): void => {
	head(
		`The lost-work charge, from the edit rate in the first ${earlyTurns} turns`,
	);
	line(["edits per request, early", charge.earlyRate.toFixed(4)]);
	line(["edits per request, steady", charge.steadyRate.toFixed(4)]);
	line(["requests early / steady", `${charge.early} / ${charge.steady}`]);
	line(["edits missing in all", charge.missingEdits.toFixed(1)]);
	line([
		"per compaction",
		`${charge.editsPer.toFixed(2)} edits, which is ${charge.turns.toFixed(1)} turns`,
	]);
	line(["which costs", usd(charge.turns * perTurn)]);
};

/** One row of the re-read table: a lookback in turns, or none for all history, whether the points are random controls, and the measure there. */
export interface Draw {
	readonly depth: number | undefined;
	readonly controls: boolean;
	readonly got: Rereads;
}

/** Prints the share in percent of reads after a compaction point that were already read, against the control points. */
export const rereadTable = (draws: readonly Draw[]): void => {
	head("Re-reading after a compaction, against a control");
	line([
		pad("lookback", 12),
		pad("point", 18),
		pad("reads", 6),
		pad("already read", 12),
		pad("with any", 12),
	]);
	for (const { depth, controls, got } of draws) {
		line([
			pad(depth === undefined ? "all history" : `${depth} turns`, 12),
			pad(controls ? `control, ${got.points}` : "after a compaction", 18),
			pad(whole(got.reads), 6),
			pad(`${got.share.toFixed(1)}%`, 12),
			pad(`${got.withAny} of ${got.points}`, 12),
		]);
	}
};

/** Prints the median and 90th percentile of the idle gaps in seconds, and how many exceed 5 minutes, 30 minutes, and 1 hour. */
export const gapsBlock = (gaps: Gaps): void => {
	head("Idle gaps between requests, the sleep-compaction bar");
	line(["gaps", whole(gaps.count)]);
	line(["median", `${gaps.median.toFixed(1)} s`]);
	line(["90th percentile", `${gaps.p90.toFixed(1)} s`]);
	line([
		"over 5 min / 30 min / 1 h",
		`${gaps.over5m} / ${gaps.over30m} / ${gaps.overHour}`,
	]);
};
