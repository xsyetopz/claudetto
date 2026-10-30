// The two run floors of the probe, and the line that says which one a count meets before any paid call.

import { EVAL_MIN_RUNS_PER_ARM } from "../../../tools/limits.ts";

/** The fewest valid runs of an arm for which the probe reports anything at all, enough to shake a pass down. */
export const SMOKE_MIN_RUNS = 3;

/**
 * The fewest runs in an arm that a page of `docs/` may cite. It is `EVAL_MIN_RUNS_PER_ARM`, which
 * `tools/evals/report.ts` reads too, so the floor a document may cite and the floor this harness
 * reports cannot drift apart.
 */
export const CITABLE_MIN_RUNS = EVAL_MIN_RUNS_PER_ARM;

/**
 * The spare runs each arm is planned with above the citable floor, with no `--runs`.
 *
 * A round planned at exactly the floor has no cover at all: the probe runs each fork once, a fork
 * that fails is recorded invalid and the round goes on one short, and the whole round is then paid
 * for and may not be cited. One spare is the cheapest cover for that, two forks of a round against a
 * round of twenty wholly wasted. It is not insurance alone, because a round that loses nothing ends
 * with more runs per arm than the floor asks for.
 *
 * It is 1 and not more because `worthRetry` covers the same ground a second time, and the two differ
 * in what they reach: the spare covers any loss, including a cause no retry recognizes, and the retry
 * covers a second loss in the same arm.
 */
export const SPARE_RUNS = 1;

/** The runs per arm a round plans with no `--runs`: the citable floor and its spare. */
export const DEFAULT_RUNS = CITABLE_MIN_RUNS + SPARE_RUNS;

/** The floor that `runs` meets: `citable` at `CITABLE_MIN_RUNS` or more, `smoke` at `SMOKE_MIN_RUNS` or more, else `below`. */
export const floorOf = (runs: number): "citable" | "smoke" | "below" => {
	if (runs >= CITABLE_MIN_RUNS) {
		return "citable";
	}
	return runs >= SMOKE_MIN_RUNS ? "smoke" : "below";
};

/**
 * The line that says which floor the round really reached, printed after it from the runs it finished.
 * The line before a round says what it planned, and the cost cap can stop a round short of that plan,
 * which would leave the plan's claim standing over a round that never met it.
 */
export const ranLine = (runs: number): string =>
	floorOf(runs) === "citable"
		? `The round finished ${runs} valid runs in every arm, which meets the citable floor (${CITABLE_MIN_RUNS}), so a page of \`docs/\` may cite it.`
		: `The round finished ${runs} valid runs in its thinnest arm, below the citable floor (${CITABLE_MIN_RUNS}), so a page of \`docs/\` may not cite it as runs per arm.`;

/**
 * The line that says which run floor `runs` meets, printed before a paid run starts. A citable count
 * also says how many forks of an arm it can lose and stay citable, because that is the figure which
 * decides whether a transient failure wastes the round, and it is not read off the run count alone.
 */
export const floorLine = (runs: number): string => {
	if (floorOf(runs) !== "citable") {
		return `${runs} runs per arm meets the smoke floor (${SMOKE_MIN_RUNS}) only, not the citable floor (${CITABLE_MIN_RUNS}), so a page of \`docs/\` may not cite it as runs per arm.`;
	}
	const spare = runs - CITABLE_MIN_RUNS;
	const cover =
		spare === 0
			? "and it carries no spare, so one lost fork takes an arm below the floor and the round is paid for and uncitable"
			: `and it carries ${spare} spare ${spare === 1 ? "run" : "runs"} per arm, so up to that many forks of an arm can be lost and the round is still citable`;
	return `${runs} runs per arm meets the citable floor (${CITABLE_MIN_RUNS}), so a page of \`docs/\` may cite it, ${cover}.`;
};
