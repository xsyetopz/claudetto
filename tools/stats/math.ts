// The statistics of the eval comparison: exact and score intervals, and a seeded bootstrap.

import {
  EVAL_STATS_CONFIDENCE,
  EVAL_STATS_RESAMPLES,
  EVAL_STATS_SEED,
} from "../limits.ts";

export type Interval = { low: number; high: number };

/** The sum of `ln(i)` for `i` up to `n`. */
const logFactorials = (n: number): number[] => {
  const out = [0];
  for (let i = 1; i <= n; i++) out.push((out[i - 1] as number) + Math.log(i));
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
    (lf[n1] as number) -
    (lf[x] as number) -
    (lf[n1 - x] as number) +
    ((lf[n2] as number) - (lf[k - x] as number) - (lf[n2 - k + x] as number)) -
    ((lf[n] as number) - (lf[k] as number) - (lf[n - k] as number));
  const observed = logP(a);
  let p = 0;
  for (let x = Math.max(0, k - n2); x <= Math.min(n1, k); x++) {
    const lp = logP(x);
    if (lp <= observed + 1e-9) p += Math.exp(lp);
  }
  return Math.min(1, p);
};

/** The standard normal quantile (Acklam), for the two-sided `confidence`. */
export const zForConfidence = (confidence: number): number => {
  const p = 1 - (1 - confidence) / 2;
  const a = [
    -39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269,
    -30.66479806614716, 2.506628277459239,
  ];
  const b = [
    -54.47609879822406, 161.5858368580409, -155.6989798598866,
    66.80131188771972, -13.28068155288572,
  ];
  const c = [
    -0.007784894002430293, -0.3223964580411365, -2.400758277161838,
    -2.549732539343734, 4.374664141464968, 2.938163982698783,
  ];
  const d = [
    0.007784695709041462, 0.3224671290700398, 2.445134137142996,
    3.754408661907416,
  ];
  const poly = (k: number[], x: number): number =>
    k.reduce((s, v) => s * x + v, 0);
  if (p > 0.97575) {
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
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
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
    for (let i = 0; i < n; i++) sum += values[Math.floor(rand() * n)] as number;
    means.push(sum / n);
  }
  means.sort((x, y) => x - y);
  const at = (q: number): number =>
    means[
      Math.min(resamples - 1, Math.max(0, Math.floor(q * resamples)))
    ] as number;
  return { low: at((1 - confidence) / 2), high: at(1 - (1 - confidence) / 2) };
};
