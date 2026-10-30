import type { WindowRow } from "../plugin.ts";

export interface Price {
	readonly rows: number;
	/** Includes the rest of the step, because the recorder writes a row per step and not per request. */
	readonly stepUsd: number;
	readonly plainUsd: number;
	/** The dollars of the compaction: the marked step less a plain one, which is an upper bound. */
	readonly usd: number;
	readonly stepPoints: number;
	readonly plainPoints: number;
	/** The points of the compaction alone. One point is a tenth of a percent, which is the resolution. */
	readonly points: number;
	/** The marked row's context is where the step ended, not the window the compaction left. */
	readonly tokensBefore: number;
	readonly tokensAfter: number;
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

/** Bounded by time, because a row carries no session id. */
export const priceOf = (
	rows: readonly WindowRow[],
	since: number,
): Price | string => {
	const run = rows.filter((row) => row.at > since);
	const at = run.findIndex((row) => row.afterCompaction === true);
	if (at < 0) {
		// Name the context: "no row is marked" alone cannot tell a threshold never crossed from a broken mark.
		const reached = Math.max(0, ...run.map((row) => row.tokens ?? 0));
		return `no row of the run is marked afterCompaction, of ${run.length} rows, whose context reached ${reached} tokens, so either no compaction fired or the mark did not land`;
	}
	const marked = run[at];
	const before = run[at - 1];
	if (marked === undefined || before === undefined) {
		return "the marked row is the first of the run, so no row prices the step before it";
	}
	// Compare rows of one kind: a `-p` step leaves two rows whose deltas differ widely.
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

/** Says the window is not measured rather than `NaN`, which cannot tell no window from a fault. */
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
