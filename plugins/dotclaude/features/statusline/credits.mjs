// The limit-reset credits that the user can spend, read from the usage cache of Claude Code.
// The cache is `cachedUsageUtilization` in `<config dir>/.claude.json`.
// It also holds the weekly window of Fable, in `utilization.limits[]`.
// It is not a documented interface, so the parser accepts one known shape and returns `null` for any other.
//
// The known shape, from Claude Code 2.1.289 and the decoder of CodexBar 0.69.0:
//   { fetchedAtMs: number, utilization: { cedar_ember: { eligible: true, grants: [
//     { resets_left: integer, paused: false, usable_now: true, starts_at: ISO | null, ends_at: ISO | null } ] } } }
// The grant fields are those of the schema in Claude Code 2.1.294 (`input.mjs` has the offsets).

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { cached } from "./cache.mjs";
import { CREDITS_MAX_AGE_MS, FABLE_MAX_AGE_MS } from "./limits.mjs";

/**
 * `{left, until}` for a `cedar_ember` block, or `null`.
 * `left` is the count of resets that are usable at `now` (milliseconds).
 * A grant counts when it is not paused, is `usable_now`, has resets left, and `now` is in its open span.
 * `until` is the earliest expiry in seconds, or `null` when no grant expires.
 */
export function parseCredits(block, now) {
  if (block?.eligible !== true || !Array.isArray(block.grants)) return null;
  let left = 0;
  let until = null;
  for (const g of block.grants) {
    const start = g?.starts_at == null ? -Infinity : Date.parse(g.starts_at);
    const end = g?.ends_at == null ? Infinity : Date.parse(g.ends_at);
    if (
      g?.paused !== false ||
      g.usable_now !== true ||
      !(Number.isInteger(g.resets_left) && g.resets_left > 0)
    )
      continue;
    if (!(start <= now && end > now)) continue;
    left += g.resets_left;
    if (Number.isFinite(end) && (until === null || end / 1000 < until))
      until = end / 1000;
  }
  return left ? { left, until } : null;
}

/**
 * `{percent, resetsAt}` for the weekly window of Fable in `limits`, or `null`.
 * The row has `kind` `weekly_scoped` and `scope.model.display_name` `Fable`.
 * `resetsAt` is in seconds, from the ISO string of the row, or `null` when the row has none.
 */
export function parseFable(limits) {
  if (!Array.isArray(limits)) return null;
  const row = limits.find(
    (l) =>
      l?.kind === "weekly_scoped" && l.scope?.model?.display_name === "Fable",
  );
  if (!Number.isFinite(row?.percent)) return null;
  const reset = Date.parse(row.resets_at);
  return {
    percent: row.percent,
    resetsAt: Number.isFinite(reset) ? reset / 1000 : null,
  };
}

/**
 * `{credits, fable}` from the usage cache file in the config dir of `env`.
 * Each part is `null` when it is absent, stale, or in another shape.
 * It reads the file one time, and only these two parts of it.
 */
export function readUsage(env = process.env, now = Date.now()) {
  const file = path.join(env.CLAUDE_CONFIG_DIR || os.homedir(), ".claude.json");
  return cached(
    `credits ${file}`,
    () => {
      try {
        const copy = JSON.parse(
          fs.readFileSync(file, "utf8"),
        ).cachedUsageUtilization;
        const age = now - copy.fetchedAtMs;
        return {
          credits:
            age < CREDITS_MAX_AGE_MS
              ? parseCredits(copy.utilization.cedar_ember, now)
              : null,
          fable:
            age < FABLE_MAX_AGE_MS ? parseFable(copy.utilization.limits) : null,
        };
      } catch {
        return { credits: null, fable: null };
      }
    },
    now,
  );
}

/** The credits from the usage cache file, or `null`. */
export const readCredits = (env, now) => readUsage(env, now).credits;
