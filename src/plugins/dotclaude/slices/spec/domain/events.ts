// The rules that read the events of one package: its verify result, its findings, and the text of one event.

import type { StateEvent } from "../../../../../kernel/spec-store.ts";

/** The events of the package `pkg`, in the order of the log. */
export const eventsOf = (
  events: readonly StateEvent[],
  pkg: string,
): StateEvent[] => events.filter((e) => e.package === pkg);

/** The last event of `events` that has a `verify` result, or undefined when the package was never verified. */
export const lastVerify = (
  events: readonly StateEvent[],
): StateEvent | undefined => events.findLast((e) => e.verify !== undefined);

/** The last event of `events` that has a `sha`, or undefined when none has. */
export const lastSha = (events: readonly StateEvent[]): string | undefined =>
  events.findLast((e) => e.sha !== undefined)?.sha;

/** True when the last event of the package is a `verify` event that failed: it has a `verify` result with a non-zero exit status. */
export const verifyFailed = (events: readonly StateEvent[]): boolean => {
  const last = events.at(-1);
  return last?.verify !== undefined && last.verify.exit !== 0;
};

/** The findings of the last event of `events` that has findings, or an empty list. */
export const lastFindings = (
  events: readonly StateEvent[],
): readonly string[] =>
  events.findLast((e) => (e.findings?.length ?? 0) > 0)?.findings ?? [];

/** One event as one line: the time, the package, the state, the verify result, the verdict, the decision, the note, and the findings. */
export const eventText = (e: StateEvent): string =>
  [
    e.at,
    e.package,
    e.state,
    e.verify === undefined
      ? undefined
      : `verify: \`${e.verify.command}\` exit ${e.verify.exit}`,
    e.sha === undefined ? undefined : `sha: ${e.sha.slice(0, 12)}`,
    e.verdict,
    e.decision === undefined ? undefined : `decision: ${e.decision}`,
    e.note === undefined ? undefined : `note: ${e.note}`,
    ...(e.findings ?? []).map((f) => `finding: ${f}`),
  ]
    .filter((part) => part !== undefined)
    .join("  ");
