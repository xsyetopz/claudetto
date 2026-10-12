// The usage sample that the status line keeps in the project, for `dotclaude-spec runs`.
// The file has the layout of `UsageSample`, and the `spec` slice reads it with its own type.

import type { StatusInput } from "./types.ts";

/** The `rate_limits` of one status object, and the time they were read in milliseconds. */
export type UsageSample = {
  savedAt: number;
  rate_limits: NonNullable<StatusInput["rate_limits"]>;
};

/** The text of the usage sample of `input`, or null when the status object has no `rate_limits`. */
export const usageSample = (input: StatusInput, now: number): string | null =>
  input.rate_limits
    ? JSON.stringify({ savedAt: now, rate_limits: input.rate_limits })
    : null;
