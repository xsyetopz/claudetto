// The rule of the `status` key: the front matter of a file is a copy of the state of its last event.
// The copy is written only by the CLI, so the rule checks that the copy and the log agree.
// Plain data and pure functions only.

import type { StateEvent } from "../../../../../../kernel/state-events.ts";
import { type GateResult, PASS, refuse } from "./gates.ts";

/** The state that a package has before its first event. */
export const PACKAGE_INITIAL = "planned";

/** The state that a change has before its first event. */
export const CHANGE_INITIAL = "draft";

/**
 * The state at the last event of `events` for `pkg`, or `initial` when no event names it.
 * With `pkg` undefined, the last event of the change itself, which has no `package` key, is the one that counts.
 */
export const lastState = (
  events: readonly StateEvent[],
  pkg: string | undefined,
  initial: string,
): string => events.findLast((e) => e.package === pkg)?.state ?? initial;

/** The rule: the `status` of a file equals the state of its last event. */
export const statusRule = (
  status: string,
  events: readonly StateEvent[],
  pkg: string | undefined,
  initial: string,
): GateResult => {
  const last = lastState(events, pkg, initial);
  return status === last
    ? PASS
    : refuse(`\`status\` is \`${status}\`, but the last event is \`${last}\`.`);
};
