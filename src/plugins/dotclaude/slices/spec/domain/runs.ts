// The rule of `dotclaude-spec runs`: how many agent runs a wave of `/ship` may start now.
// The cap is the `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` of the tier, and the usage sample of the status line lowers it.
// `/ship` adds no cap of its own.

import { USAGE_SAMPLE_MAX_MS } from "../limits.ts";

/** One limit window of the status object. `used_percentage` is in percent, and `resets_at` is in seconds. */
export type LimitWindow = {
  used_percentage?: number;
  resets_at?: number | null;
};

/** The usage sample that the status line keeps: the time it was read, in milliseconds, and its `rate_limits`. */
export type UsageSample = {
  savedAt: number;
  rate_limits?: { five_hour?: LimitWindow; seven_day?: LimitWindow };
};

/** The runs that one window allows at `now`, under the cap `cap`. A window with no usage, or one that has reset, allows the cap. */
export const windowRuns = (
  cap: number,
  window: LimitWindow | undefined,
  now: number,
): number => {
  const used = window?.used_percentage;
  if (typeof used !== "number" || !Number.isFinite(used)) return cap;
  if (typeof window?.resets_at === "number" && window.resets_at * 1000 <= now)
    return cap;
  const free = Math.min(100, Math.max(0, 100 - used));
  return Math.floor((cap * free) / 100);
};

/**
 * The runs that a wave may start at `now`.
 * It is the lowest of the cap and of the runs that the 5h and the weekly window allow.
 * No sample, or a sample with no `rate_limits`, leaves the cap, because the account gives no usage.
 * A sample older than `USAGE_SAMPLE_MAX_MS` allows one run, because its usage is not known now.
 */
export const runsAllowed = (
  cap: number,
  sample: UsageSample | null,
  now: number,
): number => {
  if (sample === null || !sample.rate_limits) return cap;
  if (now - sample.savedAt > USAGE_SAMPLE_MAX_MS) return 1;
  return Math.min(
    cap,
    windowRuns(cap, sample.rate_limits.five_hour, now),
    windowRuns(cap, sample.rate_limits.seven_day, now),
  );
};

/** The cap of a value of `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`. A value that is not a whole number of at least one gives 1, so one run goes at a time. */
export const capOf = (value: string | undefined): number => {
  const cap = Number(value);
  return Number.isInteger(cap) && cap >= 1 ? cap : 1;
};

/** The usage sample of the text of its file. It throws an `Error` on text that is not a usage sample. */
export const parseSample = (text: string): UsageSample => {
  const value: unknown = JSON.parse(text);
  if (
    value === null ||
    typeof value !== "object" ||
    typeof (value as { savedAt?: unknown }).savedAt !== "number"
  )
    throw new Error("The usage sample has no `savedAt` number.");
  return value as UsageSample;
};
