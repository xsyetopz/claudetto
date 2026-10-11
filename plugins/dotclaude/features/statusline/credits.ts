// The limit-reset credits that the user can spend, read from the usage cache of Claude Code.
// The cache is `cachedUsageUtilization` in `<config dir>/.claude.json`.
// It also holds the weekly window of Fable, in `utilization.limits[]`.
// It is not a documented interface, so the parser accepts one known shape and returns `null` for any other.
//
// The known shape, from Claude Code 2.1.289 and the decoder of CodexBar 0.69.0:
//   { fetchedAtMs: number, utilization: { cedar_ember: { eligible: true, grants: [
//     { resets_left: integer, paused: false, usable_now: true, starts_at: ISO | null, ends_at: ISO | null } ] } } }
// The grant fields are those of the schema in Claude Code 2.1.296 (`input.ts` has the offsets).

import os from "node:os";
import path from "node:path";
import { rethrowUnless, UNREADABLE } from "../../lib/errors.ts";
import { CREDITS_MAX_AGE_MS, FABLE_MAX_AGE_MS } from "./limits.ts";
import type {
  Credits,
  CreditsBlock,
  Fable,
  FableLimit,
  Usage,
  UsageCache,
} from "./types.ts";

/**
 * `{left, until}` for a `cedar_ember` block, or `null`.
 * `left` is the count of resets that are usable at `now` (milliseconds).
 * A grant counts when it is not paused, is `usable_now`, has resets left, and `now` is in its open span.
 * `until` is the earliest expiry in seconds, or `null` when no grant expires.
 */
export function parseCredits(
  block: CreditsBlock | undefined,
  now: number,
): Credits | null {
  if (block?.eligible !== true || !Array.isArray(block.grants)) return null;
  let left = 0;
  let until: number | null = null;
  for (const g of block.grants) {
    const start = g?.starts_at == null ? -Infinity : Date.parse(g.starts_at);
    const end = g?.ends_at == null ? Infinity : Date.parse(g.ends_at);
    const resets = g?.resets_left;
    if (
      g?.paused !== false ||
      g.usable_now !== true ||
      typeof resets !== "number" ||
      !(Number.isInteger(resets) && resets > 0)
    )
      continue;
    if (!(start <= now && end > now)) continue;
    left += resets;
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
export function parseFable(limits: FableLimit[] | undefined): Fable | null {
  if (!Array.isArray(limits)) return null;
  const row = limits.find(
    (l) =>
      l?.kind === "weekly_scoped" && l.scope?.model?.display_name === "Fable",
  );
  if (typeof row?.percent !== "number" || !Number.isFinite(row.percent))
    return null;
  const reset = Date.parse(row.resets_at ?? "");
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
export async function readUsage(
  env: NodeJS.ProcessEnv = process.env,
  now: number = Date.now(),
): Promise<Usage> {
  const file = path.join(
    env["CLAUDE_CONFIG_DIR"] || os.homedir(),
    ".claude.json",
  );
  const none: Usage = { credits: null, fable: null };
  let copy: UsageCache | undefined;
  try {
    const data: { cachedUsageUtilization?: UsageCache } = JSON.parse(
      await Bun.file(file).text(),
    );
    copy = data.cachedUsageUtilization;
  } catch (err) {
    // An absent file, or a file that is not JSON, has no usage cache.
    rethrowUnless(err, ...UNREADABLE, "SyntaxError");
    return none;
  }
  const age = now - (copy?.fetchedAtMs ?? NaN);
  const utilization = copy?.utilization;
  if (!utilization || !Number.isFinite(age)) return none;
  return {
    credits:
      age < CREDITS_MAX_AGE_MS
        ? parseCredits(utilization.cedar_ember, now)
        : null,
    fable: age < FABLE_MAX_AGE_MS ? parseFable(utilization.limits) : null,
  };
}

/** The credits from the usage cache file, or `null`. */
export const readCredits = async (
  env: NodeJS.ProcessEnv,
  now: number,
): Promise<Credits | null> => (await readUsage(env, now)).credits;
