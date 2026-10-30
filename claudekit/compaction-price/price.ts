// The price of one compaction, read from the rows the window recorder wrote. The pure half: the paid
// steps that produce the rows are in `main.ts`.
//
// A row carries the dollars spent since the row before it, and `afterCompaction` marks the first row
// written once a compaction has ended (the window module of the plugin). So the marked row's delta is
// one step of work plus the compaction, and a step with no compaction in it is the baseline to
// subtract. The difference is the compaction's own price.
//
// The five-hour points of a row are optional, because a login the engine reports no five-hour window
// for leaves the figure absent rather than zero. A row with no points still prices the compaction in
// dollars, so a missing figure is carried as `Number.NaN` the way the token figures already are, and
// only the points half of the price goes unread.

import type { WindowRow } from "../plugin.ts";

/** What one compaction cost, in the units the engine reports. */
export interface Price {
	/** The rows of the run that were read, the marked one included. */
	readonly rows: number;
	/**
	 * The dollars of the step that carried the compaction, which is the compaction plus whatever that
	 * step did after it. The recorder writes a row per step and not per request, so the two cannot be
	 * separated here, and `usd` below is therefore an upper bound on the compaction alone.
	 */
	readonly stepUsd: number;
	/** The mean dollars of a step of the same run with no compaction in it. */
	readonly plainUsd: number;
	/** The dollars of the compaction: the marked step less a plain one, which is an upper bound. */
	readonly usd: number;
	/** The five-hour points of the step that carried the compaction, `NaN` when the row holds none. */
	readonly stepPoints: number;
	/** The mean five-hour points of a step with no compaction in it, over the rows that hold one. */
	readonly plainPoints: number;
	/** The points of the compaction alone. One point is a tenth of a percent, which is the resolution. */
	readonly points: number;
	/**
	 * The context of the row before the compaction, in tokens, and of the marked row after it. The
	 * second is where the step that compacted ended and not the window the compaction left: a step that
	 * kept working after its boundary ended above the row before it, 23,423 tokens against 22,710, in
	 * one run of 2026-10-30. So a figure here that did not fall says the step worked on past the
	 * compaction, which is also what widens `usd` for that run.
	 */
	readonly tokensBefore: number;
	readonly tokensAfter: number;
	/**
	 * Whether the context fell across the mark. It did when the step ended at its boundary, and then
	 * `usd` is the compaction and little else. It did not when the step worked on afterwards, and then
	 * `usd` carries that work too and reads only as an upper bound. The runs of 2026-10-30 split 3 to 2
	 * on this, so it is reported rather than assumed.
	 */
	readonly fell: boolean;
}

const mean = (xs: number[]): number => {
	if (xs.length === 0) {
		return Number.NaN;
	}
	let total = 0;
	for (const x of xs) {
		total += x;
	}
	return total / xs.length;
};

/**
 * The price of the one compaction in the rows of `rows` written after `since`, or the reason it cannot
 * be read. The run is bounded by time rather than by a session id, because a row carries no session id,
 * so no other session may write the store while the run is in flight.
 */
export const priceOf = (
	rows: readonly WindowRow[],
	since: number,
): Price | string => {
	const run = rows.filter((row) => row.at > since);
	const at = run.findIndex((row) => row.afterCompaction === true);
	if (at < 0) {
		// The context is named because "no row is marked" alone does not separate a threshold that was
		// never crossed from a mark that is broken, and the first is what a run gets wrong.
		const reached = Math.max(0, ...run.map((row) => row.tokens ?? 0));
		return `no row of the run is marked afterCompaction, of ${run.length} rows, whose context reached ${reached} tokens, so either no compaction fired or the mark did not land`;
	}
	const marked = run[at];
	const before = run[at - 1];
	if (marked === undefined || before === undefined) {
		return "the marked row is the first of the run, so no row prices the step before it";
	}
	// Like for like. A `-p` step leaves two rows and their deltas differ by about twenty times, one for
	// the step's own work and one carrying a turn id after it, so a mean over both is the baseline of
	// neither. The kinds are told apart by whether the row names a turn, which is what `tagOf` sets.
	const named = marked.task !== "";
	const plain = run.filter(
		(row, i) =>
			i !== at &&
			i > 0 &&
			row.afterCompaction !== true &&
			(row.task !== "") === named,
	);
	if (plain.length === 0) {
		return "no step of the run ran without a compaction, so there is no baseline to subtract";
	}
	const plainUsd = mean(plain.map((row) => row.usd));
	const plainPoints = mean(
		plain.flatMap((row) => (row.points === undefined ? [] : [row.points])),
	);
	const stepPoints = marked.points ?? Number.NaN;
	const tokensBefore = before.tokens ?? Number.NaN;
	const tokensAfter = marked.tokens ?? Number.NaN;
	return {
		rows: run.length,
		fell: tokensAfter < tokensBefore,
		stepUsd: marked.usd,
		plainUsd,
		usd: marked.usd - plainUsd,
		stepPoints,
		plainPoints,
		points: stepPoints - plainPoints,
		tokensBefore,
		tokensAfter,
	};
};

/**
 * The report of a price, or the reason there is none. The points line says the window is not measured
 * rather than printing `NaN`, because a reader of `NaN` cannot tell a login that reports no five-hour
 * window from an arithmetic fault, and the dollar price reads either way.
 */
export const priceLine = (price: Price | string): string => {
	if (typeof price === "string") {
		return `No price. ${price}`;
	}
	const points = Number.isNaN(price.stepPoints)
		? "Points: the five-hour window is not measured on this login, so the compaction is priced in dollars alone."
		: `Points: ${price.stepPoints} against ${price.plainPoints.toFixed(2)} plain, so ${price.points.toFixed(2)} of the five-hour window, at a resolution of one point.`;
	const reading = price.fell
		? `so the compaction cost ${price.usd.toFixed(4)} in the units of total_cost_usd`
		: `so the compaction cost at most ${price.usd.toFixed(4)} in the units of total_cost_usd: the context did not fall across the mark, so the step worked on past its boundary and that work is in the figure`;
	return `${price.rows} rows of the run, context ${price.tokensBefore} tokens before the compaction and ${price.tokensAfter} after.
The step that compacted cost ${price.stepUsd.toFixed(4)} against ${price.plainUsd.toFixed(4)} for a plain step, ${reading}.
${points}`;
};
