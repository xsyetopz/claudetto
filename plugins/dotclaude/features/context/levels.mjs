// The context level of design D32: which level the context of a main session reaches.
// It is a pure function of the figure, so the hook keeps no state (design D35).

import { CONTEXT_WINDOW } from "../../lib/budget.mjs";
import { CONTEXT_HANDOFF_AT, CONTEXT_NOTICE_AT } from "./limits.mjs";

/**
 * The level of `tokens` as `{step, tokens, share}`, or `undefined` below `CONTEXT_NOTICE_AT`.
 * `step` is `notice` or `handoff`, and `share` is the percent of `window`.
 */
export function contextLevel(tokens, window = CONTEXT_WINDOW) {
  if (!(tokens > 0)) return undefined;
  const share = (tokens / window) * 100;
  if (share >= CONTEXT_HANDOFF_AT) return { step: "handoff", tokens, share };
  if (share >= CONTEXT_NOTICE_AT) return { step: "notice", tokens, share };
  return undefined;
}
