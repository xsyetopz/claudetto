// The paired analysis of the arms: both arms run the same cases, so the unit is the difference of the pass rates of one case.

import { EVAL_STATS_CONFIDENCE, EVAL_STATS_POWER } from "../../tools/limits.ts";
import { bySet, type CaseStats } from "./compare.ts";
import { type Interval, mean, zForConfidence } from "./math.ts";

/** The inputs and the result of the power check. */
export interface Power {
	gap: number;
	zAlpha: number;
	zBeta: number;
	/** The sample variance of the paired differences, which holds the variance of the answers within a case. */
	variance: number;
	casesNeeded: number;
}

export interface PairedStats {
	set: string;
	cases: number;
	meanDelta: number;
	se: number;
	ci: Interval;
	correlation: number;
	power: Power;
}

/**
 * The paired statistics of one set of cases, from the pass rates that `caseStats` averaged over the runs of each case.
 * Miller, "Adding Error Bars to Evals" (arXiv 2411.00640), Eq. 7 for the standard error, Eq. 5 for the interval, and Eq. 9 for the cases needed with the noise of the answers inside the variance.
 * The case is the cluster and holds one averaged difference, so the clustered standard error of Eq. 8 is `sqrt(Var(d) / n)` with the variance over `n - 1`.
 */
export const paired = (
	set: string,
	cases: CaseStats[],
	gap: number,
	confidence = EVAL_STATS_CONFIDENCE,
	power = EVAL_STATS_POWER,
): PairedStats => {
	const n = cases.length;
	const w = cases.map((c) => c.rateWith);
	const o = cases.map((c) => c.rateWithout);
	const d = cases.map((c) => c.rateWith - c.rateWithout);
	const [mw, mo, md] = [mean(w), mean(o), mean(d)] as const;
	const variance =
		n < 2 ? Number.NaN : (mean(d.map((x) => (x - md) ** 2)) * n) / (n - 1);
	const se = Math.sqrt(variance / n);
	const z = zForConfidence(confidence);
	const zAlpha = z;
	const zBeta = zForConfidence(2 * power - 1);
	// Means in place of sums: the factor `n` cancels in the correlation.
	const ssW = mean(w.map((x) => (x - mw) ** 2));
	const ssO = mean(o.map((x) => (x - mo) ** 2));
	const cov = mean(w.map((x, i) => (x - mw) * ((o[i] ?? 0) - mo)));
	return {
		set,
		cases: n,
		meanDelta: md,
		se,
		ci: { low: md - z * se, high: md + z * se },
		correlation: n < 2 ? Number.NaN : cov / Math.sqrt(ssW * ssO),
		power: {
			gap,
			zAlpha,
			zBeta,
			variance,
			casesNeeded: Math.ceil(((zAlpha + zBeta) ** 2 * variance) / gap ** 2),
		},
	};
};

/** The paired statistics of each set, over the current cases that ran in both arms. */
export const pairedStats = (cases: CaseStats[], gap: number): PairedStats[] =>
	bySet(cases).map(([set, cs]) => paired(set, cs, gap));
