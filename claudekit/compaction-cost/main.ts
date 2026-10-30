// Usage: bun claudekit/compaction-cost/main.ts [--thresholds 120000,200000] [--base 224999] [--seed 11] [--per 20] [--root DIR]

import { argv } from "node:process";
import { bestOf, derive, sweep } from "./bill/derive.ts";
import { crossTable, measureKept } from "./bill/fit.ts";
import { replay, tracksOf, withCharge } from "./bill/replay.ts";
import { argOf, numbersOf, oneOf } from "./flags.ts";
import { mixOf } from "./price.ts";
import * as costReport from "./report/cost.ts";
import * as workReport from "./report/work.ts";
import { boundaryStats, gapsOf } from "./transcripts/stats.ts";
import {
	boundariesOf,
	loadSessions,
	requestsOf,
	sizeOf,
} from "./transcripts/transcripts.ts";
import { chargeOf, EARLY_TURNS, orient, placeAll } from "./work/charge.ts";
import { rereads } from "./work/rereads.ts";

const DEFAULT_THRESHOLDS = [
	120_000, 146_000, 170_000, 200_000, 224_999, 267_000,
];

const DEPTHS: readonly (number | undefined)[] = [40, 100, 250, undefined];

const main = async (): Promise<void> => {
	const args = argv.slice(2);
	const thresholds = numbersOf(argOf(args, "thresholds"), DEFAULT_THRESHOLDS);
	const base = oneOf(argOf(args, "base"), 224_999);
	const seed = oneOf(argOf(args, "seed"), 11);
	const per = oneOf(argOf(args, "per"), 20);
	const sessions = await loadSessions(argOf(args, "root"));
	const boundaries = boundariesOf(sessions);
	if (boundaries.length === 0) {
		console.error("No session with a compaction was found.");
		return;
	}
	const stats = boundaryStats(sessions);
	const mix = mixOf(sessions);
	costReport.sample(
		sessions.length,
		requestsOf(sessions).length,
		boundaries.length,
	);
	costReport.compactions(stats);
	costReport.costMix(mix);

	const mode =
		argOf(args, "summary") === "constant" ? "constant" : "proportional";
	const kept = measureKept(sessions, mode);
	costReport.keptFit(kept, [225_000, 170_000, 120_000, 80_000]);

	const tracks = tracksOf(sessions);
	const fixed = { writes: mix.write, out: mix.out, kept };
	const rows = thresholds.map((threshold) => replay(tracks, threshold, fixed));
	costReport.replayTable(rows, base);

	const placed = placeAll(sessions);
	workReport.orientTable(orient(placed));
	costReport.crossTableOf(
		crossTable(placed, EARLY_TURNS, (row) => sizeOf(row.request)),
	);
	const charge = chargeOf(placed, boundaries.length);
	workReport.chargeBlock(charge, mix.perTurn, EARLY_TURNS);
	costReport.chargedTable(
		withCharge(rows, { turns: charge.turns, perTurn: mix.perTurn, base }),
		base,
	);

	const turns = oneOf(argOf(args, "charge"), charge.turns);
	const bounds = numbersOf(argOf(args, "sweep"), []);
	const [from, to, step] = bounds;
	if (from !== undefined && to !== undefined) {
		const steps = sweep(tracks, fixed, turns * mix.perTurn, {
			from,
			to,
			step: step ?? 10_000,
		});
		const band = bestOf(steps);
		costReport.sweepTable(steps, band);
		if (band !== undefined) {
			costReport.derived(derive(band.best.threshold));
		}
	}

	workReport.rereadTable(
		DEPTHS.flatMap((depth) =>
			[false, true].map((controls) => ({
				depth,
				controls,
				got: rereads(sessions, depth, { controls, seed, per }),
			})),
		),
	);
	workReport.gapsBlock(gapsOf(sessions));
	costReport.footer(stats);
};

await main();
