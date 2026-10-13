// The rules that read the events of one package: its verdicts, its findings, and the text of one event.

import type { LaneEvent } from "../../../../../kernel/spec-store.ts";

/** The events of the package `pkg`, in the order of the log. */
export const eventsOf = (
  events: readonly LaneEvent[],
  pkg: string,
): LaneEvent[] => events.filter((e) => e.package === pkg);

/** The last event of `events` with a verdict, or undefined when no review has a verdict. */
export const lastVerdict = (
  events: readonly LaneEvent[],
): LaneEvent | undefined => events.findLast((e) => e.verdict !== undefined);

/**
 * True when the events of one package end in an `approve` of the work that is in review now.
 * A `reject` after the approve takes it back, and so does a move to `doing`, because the work changes after it.
 */
export const approved = (events: readonly LaneEvent[]): boolean => {
  const verdict = events.findLastIndex((e) => e.verdict !== undefined);
  const work = events.findLastIndex((e) => e.lane === "doing");
  return verdict > work && events[verdict]?.verdict === "approve";
};

/** The findings of the last event of `events` that has findings, or an empty list. */
export const lastFindings = (events: readonly LaneEvent[]): readonly string[] =>
  events.findLast((e) => (e.findings?.length ?? 0) > 0)?.findings ?? [];

/** One event as one line: the time, the package, the lane, the verdict, the note, and the findings. */
export const eventText = (e: LaneEvent): string =>
  [
    e.at,
    e.package,
    e.lane,
    e.verdict,
    e.note === undefined ? undefined : `note: ${e.note}`,
    ...(e.findings ?? []).map((f) => `finding: ${f}`),
  ]
    .filter((part) => part !== undefined)
    .join("  ");
