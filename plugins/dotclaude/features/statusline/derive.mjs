// Pure functions for the values that the status line derives from its input.
// Times are in seconds, as in `rate_limits[*].resets_at`.

import { BURN_WINDOW_S, PACE_MIN_FRACTION, RATE_MIN_MS } from "./limits.mjs";

/**
 * The pace of a limit window of `span` seconds at time `now`, or `null` while it is too early.
 * `delta` is the used percentage minus the elapsed percentage of the window,
 * so a positive value is a deficit and a negative value is a reserve.
 * `runOutAt` is the time at which the limit runs out at the current rate,
 * and it is `null` when the limit lasts to `resets_at`.
 */
export function pace(window, now, span) {
  const used = window?.used_percentage;
  const left = window?.resets_at - now;
  if (!(Number.isFinite(used) && left >= 0 && left <= span)) return null;
  const elapsed = (span - left) / span;
  if (elapsed < PACE_MIN_FRACTION) return null;
  const delta = Math.round(used - 100 * elapsed);
  const out = used > 0 ? now + ((100 - used) * elapsed * span) / used : null;
  const runOutAt =
    out !== null && used < 100 && out < window.resets_at ? out : null;
  return { delta, runOutAt };
}

/** The hit percentage, the misses that tell something, and the cause of the last such miss. */
export function cacheStats(cache) {
  const causes = cache?.miss_causes ?? {};
  // Idle time past the TTL and a model switch are no cache fault, so they do not count.
  const misses =
    (cache?.misses ?? 0) -
    (causes.ttl_expired_5m ?? 0) -
    (causes.ttl_expired_1h ?? 0) -
    (causes.model_changed ?? 0);
  const last = (cache?.last_miss_cause?.causes ?? []).find(
    (c) => c !== "model_changed" && !c.startsWith("ttl_expired"),
  );
  return {
    hit:
      typeof cache?.hit_ratio === "number"
        ? Math.round(cache.hit_ratio * 100)
        : null,
    misses: Math.max(misses, 0),
    last: last ?? null,
  };
}

/** The seconds until the prompt cache expires, or 0 when it is cold. */
export const cacheLeft = (cache, now) =>
  cache?.warm ? Math.max((cache.expires_at ?? 0) - now, 0) : 0;

/** The cost and the changed lines for each hour of the session, or `null` for a session that is too short. */
export function rates(cost) {
  const ms = cost?.total_duration_ms;
  if (!(ms >= RATE_MIN_MS)) return null;
  const hours = ms / 3_600_000;
  const lines = (cost.total_lines_added ?? 0) + (cost.total_lines_removed ?? 0);
  return {
    costPerHour: Number.isFinite(cost.total_cost_usd)
      ? cost.total_cost_usd / hours
      : null,
    linesPerHour: lines / hours,
  };
}

/** The tokens left to the context window, and never below 0. */
export const headroom = (tokens, window) => Math.max(window - tokens, 0);

/**
 * The burn rate of the samples `{t, pct}` in percent for each hour, or `null` with fewer than 2 samples.
 * It reads the samples of the last `BURN_WINDOW_S` seconds before the newest one.
 */
export function burnRate(samples) {
  if (!Array.isArray(samples) || samples.length < 2) return null;
  const last = samples.at(-1);
  const first = samples.find((s) => last.t - s.t <= BURN_WINDOW_S);
  if (!first || last.t <= first.t) return null;
  return ((last.pct - first.pct) * 3600) / (last.t - first.t);
}
