// Statistics of the report: pass^k with the unbiased estimator, cost for each
// resolved task, and a paired bootstrap over cases (design D9).

import {
  EVAL_BOOTSTRAP_RESAMPLES,
  EVAL_BOOTSTRAP_SEED,
  EVAL_CONFIDENCE,
} from "../limits.mjs";

/** Binomial coefficient as a float. */
function choose(n, k) {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return r;
}

/** pass^k of one case: C(c, k) / C(n, k) for c passes in n runs. */
export function passPowK(n, c, k) {
  if (n < k) return null;
  return choose(c, k) / choose(n, k);
}

export const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

/**
 * pass^k of an arm: the mean over cases. `byCase` is `[{n, c}]`.
 * Cases with fewer than k runs (a partial suite) are left out.
 */
export function passK(byCase, k) {
  const xs = byCase
    .map(({ n, c }) => passPowK(n, c, k))
    .filter((x) => x !== null);
  return xs.length ? mean(xs) : null;
}

/** Cost for each resolved task, or null when no run is resolved. */
export const costPerResolved = (runs) => perResolved(runs, (r) => r.usage.cost);

/**
 * Turns for each resolved task, or null when no run is resolved.
 * A variant that resolves more tasks can use more turns, so `turns` is judged with this figure, not alone.
 */
export const turnsPerResolved = (runs) =>
  perResolved(runs, (r) => r.usage.turns ?? 0);

function perResolved(runs, pick) {
  const resolved = runs.filter((r) => r.resolved).length;
  if (resolved === 0) return null;
  return runs.reduce((a, r) => a + pick(r), 0) / resolved;
}

/** A small seeded generator (mulberry32), so a report is the same each time. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The paired difference (a minus b) over cases with a bootstrap interval.
 * `pairs` is `[[a, b], ...]`, one pair for each case.
 * `shown` is false when the interval includes 0.
 */
export function pairedBootstrap(
  pairs,
  {
    resamples = EVAL_BOOTSTRAP_RESAMPLES,
    confidence = EVAL_CONFIDENCE,
    seed = EVAL_BOOTSTRAP_SEED,
  } = {},
) {
  if (pairs.length === 0) return null;
  const diffs = pairs.map(([a, b]) => a - b);
  const rand = rng(seed);
  const means = [];
  for (let i = 0; i < resamples; i++) {
    let s = 0;
    for (let j = 0; j < diffs.length; j++) {
      s += diffs[Math.floor(rand() * diffs.length)];
    }
    means.push(s / diffs.length);
  }
  means.sort((x, y) => x - y);
  const tail = (1 - confidence) / 2;
  const lo = means[Math.floor(tail * resamples)];
  const hi =
    means[Math.min(resamples - 1, Math.ceil((1 - tail) * resamples) - 1)];
  return {
    diff: mean(diffs),
    lo,
    hi,
    cases: pairs.length,
    shown: lo > 0 || hi < 0,
  };
}
