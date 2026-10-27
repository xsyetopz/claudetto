// The statistics of the eval comparison: exact and score intervals, and a seeded bootstrap.

import {
	EVAL_STATS_CONFIDENCE,
	EVAL_STATS_RESAMPLES,
	EVAL_STATS_SEED,
} from "../../tools/limits.ts";

export interface Interval {
	low: number;
	high: number;
}

/** The sum of `ln(i)` for `i` up to `n`. */
const logFactorials = (n: number): number[] => {
	const out = [0];
	for (let i = 1; i <= n; i++) {
		out.push((out[i - 1] ?? 0) + Math.log(i));
	}
	return out;
};

/** The two-sided Fisher exact p of `a` of `n1` against `b` of `n2`: the sum of the tables that are not more likely than the observed table. */
export const fisherExact = (
	a: number,
	n1: number,
	b: number,
	n2: number,
): number => {
	const k = a + b;
	const n = n1 + n2;
	const lf = logFactorials(n);
	const logP = (x: number): number =>
		(lf[n1] ?? 0) -
		(lf[x] ?? 0) -
		(lf[n1 - x] ?? 0) +
		((lf[n2] ?? 0) - (lf[k - x] ?? 0) - (lf[n2 - k + x] ?? 0)) -
		((lf[n] ?? 0) - (lf[k] ?? 0) - (lf[n - k] ?? 0));
	const observed = logP(a);
	let p = 0;
	for (let x = Math.max(0, k - n2); x <= Math.min(n1, k); x++) {
		const lp = logP(x);
		if (lp <= observed + 1e-9) {
			p += Math.exp(lp);
		}
	}
	return Math.min(1, p);
};

/** The standard normal quantile (Acklam), for the two-sided `confidence`. */
export const zForConfidence = (confidence: number): number => {
	const p = 1 - (1 - confidence) / 2;
	const a = [
		-39.696_830_286_653_76, 220.946_098_424_520_5, -275.928_510_446_968_7,
		138.357_751_867_269, -30.664_798_066_147_16, 2.506_628_277_459_239,
	];
	const b = [
		-54.476_098_798_224_06, 161.585_836_858_040_9, -155.698_979_859_886_6,
		66.801_311_887_719_72, -13.280_681_552_885_72,
	];
	const c = [
		-0.007_784_894_002_430_293, -0.322_396_458_041_136_5,
		-2.400_758_277_161_838, -2.549_732_539_343_734, 4.374_664_141_464_968,
		2.938_163_982_698_783,
	];
	const d = [
		0.007_784_695_709_041_462, 0.322_467_129_070_039_8, 2.445_134_137_142_996,
		3.754_408_661_907_416,
	];
	const poly = (k: number[], x: number): number => {
		let acc = 0;
		for (const v of k) {
			acc = acc * x + v;
		}
		return acc;
	};
	if (p > 0.975_75) {
		const q = Math.sqrt(-2 * Math.log(1 - p));
		return -poly(c, q) / (poly(d, q) * q + 1);
	}
	const q = p - 0.5;
	const r = q * q;
	return (poly(a, r) * q) / (poly(b, r) * r + 1);
};

/** The Wilson score interval for `x` of `n`. */
export const wilson = (x: number, n: number, z: number): Interval => {
	const p = x / n;
	const centre = (p + (z * z) / (2 * n)) / (1 + (z * z) / n);
	const half =
		(z / (1 + (z * z) / n)) *
		Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
	return { low: Math.max(0, centre - half), high: Math.min(1, centre + half) };
};

/** The Newcombe hybrid score interval (method 10) for `x1/n1 - x2/n2`, built on two Wilson intervals. */
export const newcombe = (
	x1: number,
	n1: number,
	x2: number,
	n2: number,
	confidence = EVAL_STATS_CONFIDENCE,
): Interval => {
	const z = zForConfidence(confidence);
	const p1 = x1 / n1;
	const p2 = x2 / n2;
	const w1 = wilson(x1, n1, z);
	const w2 = wilson(x2, n2, z);
	const d = p1 - p2;
	return {
		low: d - Math.sqrt((p1 - w1.low) ** 2 + (w2.high - p2) ** 2),
		high: d + Math.sqrt((w1.high - p1) ** 2 + (p2 - w2.low) ** 2),
	};
};

/** A seeded generator (mulberry32) of numbers in `[0, 1)`. */
export const seededRandom = (seed: number): (() => number) => {
	let s = seed >>> 0;
	return () => {
		s = (s + 0x6d_2b_79_f5) >>> 0;
		let t = s;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
	};
};

/** The percentile bootstrap interval of the mean of `values`, which resamples the values (the cases). */
export const bootstrapMean = (
	values: number[],
	seed = EVAL_STATS_SEED,
	resamples = EVAL_STATS_RESAMPLES,
	confidence = EVAL_STATS_CONFIDENCE,
): Interval => {
	const rand = seededRandom(seed);
	const n = values.length;
	const means: number[] = [];
	for (let r = 0; r < resamples; r++) {
		let sum = 0;
		for (let i = 0; i < n; i++) {
			sum += values[Math.floor(rand() * n)] ?? 0;
		}
		means.push(sum / n);
	}
	means.sort((x, y) => x - y);
	const at = (q: number): number =>
		means[Math.min(resamples - 1, Math.max(0, Math.floor(q * resamples)))] ?? 0;
	return { low: at((1 - confidence) / 2), high: at(1 - (1 - confidence) / 2) };
};
