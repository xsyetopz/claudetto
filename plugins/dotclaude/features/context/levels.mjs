// The levels of design D32: which levels the context and the usage windows of a main session reach,
// and which of them are new in the session.

import { CONTEXT_WINDOW } from "../../lib/budget.mjs";
import {
  CONTEXT_HANDOFF_AT,
  CONTEXT_NOTICE_AT,
  RATE_HANDOFF_AT,
  RATE_HANDOFF_MINUTES,
  RATE_NOTICE_AT,
} from "./limits.mjs";

/**
 * The levels that the session reaches, each as `{id, kind, step, ...}`.
 * `kind` is `context` or a key of the usage windows, and `step` is `notice` or `handoff`.
 * A usage id has the reset time, so that a new window can fire its levels again.
 * `usage` is the result of `readUsage`, and `now` is in seconds.
 */
export function levelsOf(tokens, usage, now, window = CONTEXT_WINDOW) {
  const out = [];
  const share = (tokens / window) * 100;
  for (const [step, at] of [
    ["notice", CONTEXT_NOTICE_AT],
    ["handoff", CONTEXT_HANDOFF_AT],
  ])
    if (tokens > 0 && share >= at)
      out.push({ id: `context:${step}`, kind: "context", step, tokens, share });
  for (const [kind, w] of Object.entries(usage ?? {})) {
    const fast =
      Number.isFinite(w.run_out_at) &&
      w.run_out_at > now &&
      w.run_out_at - now <= RATE_HANDOFF_MINUTES * 60;
    for (const [step, at] of [
      ["notice", RATE_NOTICE_AT],
      ["handoff", RATE_HANDOFF_AT],
    ])
      if (w.used_percentage >= at || fast)
        out.push({ id: `${kind}@${w.resets_at}:${step}`, kind, step, ...w });
  }
  return out;
}

/** The highest new level of each kind in `levels`, given the ids in `fired`. */
export function newLevels(levels, fired) {
  const top = new Map();
  for (const l of levels)
    if (!fired.has(l.id) && top.get(l.kind)?.step !== "handoff")
      top.set(l.kind, l);
  return [...top.values()];
}
