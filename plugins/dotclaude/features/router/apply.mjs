// The applier of the router: the model and effort for one `turn.step`.
// The functions are pure. `hooks.mjs` reads the state, calls them, and keeps the result.

import { capEffort, lowerEffort } from "./cap.mjs";

/**
 * The rewrite of the first step of a main-loop turn, from the decision of `routePrompt`.
 * The result is `{ model, effort }`, or undefined when the step stays as it is.
 * The model stays the model of the step, and only the effort changes (design D13).
 * The effort is capped by the allowed efforts of that model, by the effort of the step, which holds `--effort` of the session,
 * and by `sessionEffort`, the `effortLevel` setting. The lower one wins.
 */
export function mainRewrite(step, decision, sessionEffort) {
  if (!decision?.routed) return undefined;
  const effort = capEffort(
    step.model,
    decision.effort,
    lowerEffort(sessionEffort, step.effort),
  );
  return effort ? { model: step.model, effort } : undefined;
}

/** The step input with the rewrite applied. A step with no rewrite stays as it is. */
export const applied = (step, rewrite) =>
  rewrite ? { ...step, model: rewrite.model, effort: rewrite.effort } : step;
