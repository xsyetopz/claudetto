// The order of the mod handlers of one plugin (design, "The slice manifest"):
// by event, then by phase (`PHASES`), then by slice name, then by filter.
// So the handlers of one event and filter run by phase, then by slice name.
// One slice with two handlers of the same event, filter, and phase is an error, because their order is not defined.
// Two handlers of one event with no filter are an error too, unless both are in the `observe` phase:
// `register.ts` then joins them in one `on()` call (`emit/register.ts`).
// An `observe` handler reads the event and passes it on, so the join keeps the order of the handlers and the one chain.

import { type ModHandler, PHASES } from "../../src/kernel/slice.ts";
import { literal } from "./literal.ts";

/** One mod handler and the name of its slice. */
export interface Entry {
  readonly slice: string;
  readonly handler: ModHandler;
}

/** The literal of the filter of `e`, which is also the key that compares two filters. */
export const filterOf = (e: Entry): string =>
  e.handler.filter === undefined
    ? ""
    : literal(e.handler.filter, `slice ${e.slice}, event ${e.handler.event}`);

/** Whether the handler of `e` is in the phase `observe`, which may join another observe handler of its event with no filter. */
export const isObserve = (e: Entry): boolean => e.handler.phase === "observe";

const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/**
 * `entries` in the order of the generated `register.ts`. It throws on two handlers of one slice with the same event, filter, and phase,
 * and on two handlers of one event with no filter, because the mod runtime refuses two unfiltered registrations of one event.
 */
export const order = (entries: readonly Entry[]): Entry[] => {
  const seen = new Set<string>();
  const bare = new Map<string, Entry>();
  for (const e of entries) {
    const key = JSON.stringify([
      e.slice,
      e.handler.event,
      filterOf(e),
      e.handler.phase,
    ]);
    if (seen.has(key))
      throw new Error(
        `slice ${e.slice}: two mod handlers have the event ${e.handler.event}, the filter ${filterOf(e) || "(none)"}, and the phase ${e.handler.phase}. Join them, or give them different phases.`,
      );
    seen.add(key);
    if (e.handler.filter !== undefined) continue;
    const first = bare.get(e.handler.event);
    if (first && !(isObserve(first) && isObserve(e)))
      throw new Error(
        `slice ${first.slice} and slice ${e.slice}: both have a mod handler of the event ${e.handler.event} with no filter, and the mod runtime refuses two of them unless both are in the phase observe. Give one of the handlers a filter, or join the two handlers in one handler of one slice.`,
      );
    bare.set(e.handler.event, first ?? e);
  }
  return [...entries].sort(
    (a, b) =>
      compare(a.handler.event, b.handler.event) ||
      PHASES.indexOf(a.handler.phase) - PHASES.indexOf(b.handler.phase) ||
      compare(a.slice, b.slice) ||
      compare(filterOf(a), filterOf(b)),
  );
};
