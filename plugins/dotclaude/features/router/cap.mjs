// The cap of the router.
// The profile sets `maxEffortLevel` to `max`, which means no cap, so the router keeps its own.

import { ALLOWED_EFFORTS, EFFORT_ORDER } from "./limits.mjs";

const rank = (e) => EFFORT_ORDER.indexOf(e);

/** The lower of two efforts. A value that is not a known level is ignored, and both unknown give undefined. */
export function lowerEffort(a, b) {
  if (rank(a) < 0) return rank(b) < 0 ? undefined : b;
  return rank(b) >= 0 && rank(b) < rank(a) ? b : a;
}

/**
 * The effort to request on `model`, from `wanted`.
 * It is never above the highest allowed effort of the model, which is never `max`, and `xhigh` for no Sonnet 5.5.
 * It is never above `sessionEffort`, the effort that the user set, when that is a known level.
 * A model out of the roster has no allowed list, so the result is undefined and the caller does not route.
 */
export function capEffort(model, wanted, sessionEffort) {
  const allowed = ALLOWED_EFFORTS[model];
  if (!allowed || rank(wanted) < 0) return undefined;
  let top = allowed.at(-1);
  if (rank(sessionEffort) >= 0 && rank(sessionEffort) < rank(top))
    top = EFFORT_ORDER[rank(sessionEffort)];
  const e = rank(wanted) > rank(top) ? top : wanted;
  // A session effort between two allowed levels, or below the lowest one, cannot give a level the model does not allow.
  return allowed.includes(e)
    ? e
    : (allowed.filter((a) => rank(a) <= rank(e)).at(-1) ?? allowed[0]);
}

/**
 * The decision for one `turn.step` of the main loop or a subagent.
 * Each step input carries the session values again (tasks 2.4 and 2.10), so the hook applies the decision of the turn at every step.
 * The first step takes `fresh`, and later steps keep `stored`, so a turn never changes model or effort in the middle.
 */
export function stepDecision(stored, fresh, step) {
  return step === 0 || !stored ? fresh : stored;
}
