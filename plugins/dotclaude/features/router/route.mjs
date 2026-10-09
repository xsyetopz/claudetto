// The router: the model and effort for a subagent spawn or a user prompt.
// All functions are pure. A hook reads the state, calls them, and applies the result.

import { capEffort, lowerEffort } from "./cap.mjs";
import { classifyPrompt, classifySpawn } from "./classify.mjs";
import {
  BLOCKING_ENV,
  DEBUG_ESCALATED,
  HAIKU,
  LONG_PROMPT_PAIR,
  MAIN_EFFORT,
  TABLE,
} from "./data.mjs";
import {
  CHARS_PER_TOKEN,
  ESCALATE_AFTER_FAILED_FIXES,
  HAIKU_PROMPT_MAX_TOKENS,
} from "./limits.mjs";

/** The blocking variables that are set in `env`, in the order of `BLOCKING_ENV`. */
export const blockedBy = (env = {}) => BLOCKING_ENV.filter((k) => env[k]);

/** The message for a user when a variable stops the router. It is the reason for `{ routed: false }`. */
export const blockedMessage = (names) =>
  `The router cannot route, because ${names.map((n) => `\`${n}\``).join(" and ")} ${names.length > 1 ? "are" : "is"} set. Unset ${names.length > 1 ? "them" : "it"} to turn routing on.`;

/** The pair of `cls`, after the escalation of a debug task and the long-prompt rule for Haiku 5.5. */
function pairOf(cls, { promptChars = 0, failedFixes = 0 }) {
  let pair = TABLE[cls];
  if (cls === "debug" && failedFixes >= ESCALATE_AFTER_FAILED_FIXES)
    pair = DEBUG_ESCALATED;
  const tokens = Math.ceil(promptChars / CHARS_PER_TOKEN);
  if (pair.model === HAIKU && tokens > HAIKU_PROMPT_MAX_TOKENS)
    pair = LONG_PROMPT_PAIR;
  return pair;
}

const skip = (reason) => ({ routed: false, reason });

function decide(cls, state, promptChars) {
  const pair = pairOf(cls, { promptChars, failedFixes: state.failedFixes });
  const effort = capEffort(pair.model, pair.effort, state.sessionEffort);
  return effort
    ? { routed: true, class: cls, model: pair.model, effort }
    : skip("The model has no allowed efforts.");
}

/**
 * The route of a subagent spawn.
 * `task` has `subagentType`, `prompt`, `description`, `model`, and `effort` of the `Agent` input.
 * `state` has `env`, `sessionEffort` (the effort that the user set), and `failedFixes`.
 * The result is `{ routed: true, class, model, effort }`, with a full model id,
 * or `{ routed: false, reason }`, where `reason` says why the spawn stays as it is.
 */
export function routeSpawn(task, state = {}) {
  const blocked = blockedBy(state.env);
  if (blocked.length) return skip(blockedMessage(blocked));
  if (task.subagentType === "fork")
    return skip("A fork inherits the model and effort of its parent.");
  if (task.model || task.effort)
    return skip("The Agent input sets a model or an effort.");
  const cls = classifySpawn(task);
  if (!cls) return skip("No task class matches.");
  return decide(cls, state, String(task.prompt ?? "").length);
}

/**
 * The route of a user prompt in the main loop. `state` is as for `routeSpawn`.
 * The result is `{ routed: true, class, effort }` with no model, because the main loop keeps its model.
 * `mainRewrite` caps the effort again for the model of the step.
 */
export function routePrompt(prompt, state = {}) {
  const blocked = blockedBy(state.env);
  if (blocked.length) return skip(blockedMessage(blocked));
  const cls = classifyPrompt(prompt);
  return {
    routed: true,
    class: cls,
    effort: lowerEffort(MAIN_EFFORT[cls], state.sessionEffort),
  };
}
