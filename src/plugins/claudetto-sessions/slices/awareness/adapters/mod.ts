// The mod handlers of the `awareness` slice. They make no model call, so `requests` is 0.
// `session.measure` makes one note when the seven-day window reaches `WEEKLY_WARN_PERCENT`.
// `tool.call` gives the note to the main agent after the result of its next call that ran, once.
// No hook writes a stamp into the transcript. The lab test of `session.start` checks that, and the usage report reads the versions from the transcript.
// Each hook catches its error, writes it to the debug log, and lets the session go on.

import type { Handler } from "../../../../../kernel/slice.ts";
import { weeklyPercent } from "../domain/note.ts";
import { WEEKLY_WARN_PERCENT } from "../limits.ts";
import { WEEKLY_NOTE } from "../prompts.ts";

/** The session values that `types/index.d.ts` declares. */
const NOTE = { plugin: "claudetto-sessions", key: "note" } as const;
const WARNED = { plugin: "claudetto-sessions", key: "warned" } as const;

/** The `session.measure` hook: the first measure at or above the bound makes the note. */
export const onMeasure: Handler<"session.measure"> = async ($, e, next) => {
  try {
    const percent = weeklyPercent(e.rateLimits);
    const { value: warned } = await $.state.get(WARNED);
    if (percent !== undefined && percent >= WEEKLY_WARN_PERCENT && !warned) {
      await $.state.set(WARNED, true);
      await $.state.set(NOTE, WEEKLY_NOTE({ percent: String(percent) }));
    }
  } catch (error) {
    // The catch has no narrower test, because a state call documents no error type.
    $.ui.log(`claudetto-sessions: ${String(error)}`, { to: "debug" });
  }
  return next(e);
};

/**
 * The `tool.call` hook: the note goes to the main agent after the result of a call that ran.
 * A call of a subagent, and a denied call, get no note, so the note waits for a call that ran.
 */
export const onNote: Handler<"tool.call"> = async ($, e, next) => {
  const out = await next(e);
  try {
    if (e.agentId !== undefined || out.result === undefined) return out;
    const { value: note } = await $.state.get(NOTE);
    if (note === undefined || note === null) return out;
    await $.state.set(NOTE, null);
    return { ...out, context: [...(out.context ?? []), note] };
  } catch (error) {
    // The catch has no narrower test, because a state call documents no error type.
    $.ui.log(`claudetto-sessions: ${String(error)}`, { to: "debug" });
    return out;
  }
};
