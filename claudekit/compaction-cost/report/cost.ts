// Printing only: the tables about the bill. Each section prints one table of `main.ts`,
// so the numbers can be copied straight into the two evidence pages.

import type { Derived, Step } from "../bill/derive.ts";
import { type Cell, type Kept, keptOf } from "../bill/fit.ts";
import type { Charged, Row } from "../bill/replay.ts";
import { type Mix, money, OPUS } from "../price.ts";
import type { BoundaryStats } from "../transcripts/stats.ts";
import { head, line, pad, pct, usd, whole } from "./format.ts";

/** Prints the size of the loaded sample: sessions, requests, and compactions. */
export const sample = (
	sessions: number,
	requests: number,
	boundaries: number,
): void => {
	head(
		`Sample: ${sessions} sessions, ${whole(requests)} requests, ${boundaries} compactions`,
	);
};

/** Prints the mean pre and post context in tokens, the kept share in percent with its range, and the mean duration in seconds of the compactions that ran. */
export const compactions = (stats: BoundaryStats): void => {
	head("The compactions that ran");
	line(["trigger auto", `${stats.auto} of ${stats.count}`]);
	line(["mean pre", whole(stats.pre)]);
	line(["mean post", whole(stats.post)]);
	line([
		"kept share",
		`${stats.keptShare.toFixed(2)}% (${stats.keptLow.toFixed(2)}% to ${stats.keptHigh.toFixed(2)}%)`,
	]);
	line(["mean duration", `${stats.seconds.toFixed(1)} s`]);
};

/** Prints the measured dollars of each billed line with its percent of the total, and the dollars of one turn. */
export const costMix = (mix: Mix): void => {
	head("The measured cost mix, nothing modelled");
	const lines: readonly (readonly [string, number, boolean])[] = [
		["cache reads", mix.read, true],
		["cache writes", mix.write, true],
		["output", mix.out, true],
		["fresh input", mix.fresh, true],
		["total", mix.total, false],
	];
	for (const [label, value, share] of lines) {
		line([
			pad(label, 12),
			pad(usd(value), 9),
			pad(share ? `${((100 * value) / mix.total).toFixed(1)}%` : "", 6),
		]);
	}
	line([pad("per turn", 12), pad(`$${mix.perTurn.toFixed(4)}`, 9), pad("", 6)]);
};

/** Prints one row per replayed threshold, in tokens and dollars, with the percent change of `billed` against the row at `base`, or the last row when `base` is not swept. */
export const replayTable = (rows: readonly Row[], base: number): void => {
	const billedBase =
		rows.find((row) => row.threshold === base)?.billed ??
		rows[rows.length - 1]?.billed ??
		0;
	head("The replay: what each threshold would have been billed");
	line([
		pad("threshold", 9),
		pad("compactions", 11),
		pad("mean prompt", 11),
		pad("reads", 9),
		pad("compacting", 10),
		pad("billed", 9),
		pad("vs base", 8),
	]);
	for (const row of rows) {
		line([
			pad(whole(row.threshold), 9),
			pad(String(row.compactions), 11),
			pad(whole(row.meanPrompt), 11),
			pad(usd(row.reads), 9),
			pad(usd(row.compacting), 10),
			pad(usd(row.billed), 9),
			pad(
				row.threshold === base
					? "base"
					: pct((100 * (row.billed - billedBase)) / billedBase),
				8,
			),
		]);
	}
};

/** Prints the replay with the lost-work charge in dollars, and the turns of lost work per compaction at which the base threshold would win. */
export const chargedTable = (
	charged: readonly Charged[],
	base: number,
): void => {
	head("The replay with that charge applied");
	line([
		pad("threshold", 9),
		pad("billed", 9),
		pad("wasted", 8),
		pad("together", 9),
		pad("vs base", 8),
		pad("break-even", 10),
	]);
	for (const one of charged) {
		line([
			pad(whole(one.row.threshold), 9),
			pad(usd(one.row.billed), 9),
			pad(usd(one.wasted), 8),
			pad(usd(one.together), 9),
			pad(one.row.threshold === base ? "base" : pct(one.against), 8),
			pad(one.breakEven === 0 ? "-" : `${one.breakEven.toFixed(1)} turns`, 10),
		]);
	}
};

/** Prints the fitted fixed block and summary in tokens, then what a compaction of each of `sizes` leaves, in tokens and percent. */
export const keptFit = (kept: Kept, sizes: readonly number[]): void => {
	head(`What a compaction leaves behind, measured, summary ${kept.mode}`);
	line(["boundaries with a summary record", String(kept.rows)]);
	line(["fixed block", whole(kept.fixed)]);
	line(["mean summary", whole(kept.summary)]);
	line(["summary per token compacted", kept.share.toFixed(4)]);
	for (const size of sizes) {
		const left = keptOf(kept, size);
		line([
			`a compaction of ${whole(size)} leaves`,
			`${whole(left)}, which is ${((100 * left) / size).toFixed(1)}%`,
		]);
	}
};

/** Prints the mean edits per request by prompt-size band, early after a compaction against steady, with the early rate as a percent of the steady one. */
export const crossTableOf = (cells: readonly Cell[]): void => {
	head("The edit rate by context size and by distance from a compaction");
	line([
		pad("prompt size", 14),
		pad("early reqs", 10),
		pad("early edits", 11),
		pad("steady reqs", 11),
		pad("steady edits", 12),
		pad("early share", 11),
	]);
	for (const cell of cells) {
		line([
			pad(cell.label, 14),
			pad(String(cell.early.requests), 10),
			pad(cell.early.edit.toFixed(3), 11),
			pad(String(cell.steady.requests), 11),
			pad(cell.steady.edit.toFixed(3), 12),
			pad(
				cell.steady.edit === 0
					? "-"
					: `${((100 * cell.early.edit) / cell.steady.edit).toFixed(0)}%`,
				11,
			),
		]);
	}
};

/** Prints the fine sweep in tokens and dollars, and the cheapest threshold with the range within 1% of it when `band` is given. */
export const sweepTable = (
	steps: readonly Step[],
	band: { best: Step; low: number; high: number } | undefined,
): void => {
	head("The fine sweep, billed plus the lost-work charge");
	line([
		pad("threshold", 9),
		pad("compactions", 11),
		pad("billed", 9),
		pad("wasted", 8),
		pad("together", 9),
	]);
	for (const step of steps) {
		line([
			pad(whole(step.threshold), 9),
			pad(String(step.compactions), 11),
			pad(usd(step.billed), 9),
			pad(usd(step.wasted), 8),
			pad(usd(step.together), 9),
		]);
	}
	if (band !== undefined) {
		line([
			"cheapest",
			`${whole(band.best.threshold)} at ${usd(band.best.together)}, within 1% from ${whole(band.low)} to ${whole(band.high)}`,
		]);
	}
};

/** Prints the percent and window settings that a handoff trigger implies, and the token count where each one fires. */
export const derived = (one: Derived): void => {
	head(`The tier values a trigger of ${whole(one.trigger)} implies`);
	line(["AUTOCOMPACT_PCT", one.pct.toFixed(4)]);
	line(["the engine fires at", whole(one.fires)]);
	line(["HAIKU_AUTOCOMPACT_WINDOW", whole(one.haikuWindow)]);
	line(["which fires at", whole(one.haikuFires)]);
};

/** Prints the price row used, in dollars per million tokens, and the dollars of one compaction of the mean context. */
export const footer = (stats: BoundaryStats): void => {
	const one = money(stats.pre, OPUS.read) + money(stats.post, OPUS.out);
	console.info(
		`\nPrices: the published claude-opus-5-5 row, $${OPUS.read} read, $${OPUS.write} write (1h), $${OPUS.out} output per million. One compaction of the mean context costs ${usd(one)} to run.\n`,
	);
};
