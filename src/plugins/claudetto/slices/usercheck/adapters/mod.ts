// The mod handlers of the `usercheck` slice. Each handler makes no model call, so `requests` is 0.
//
// `classic.PermissionDenied` keeps the denied calls of each session.
// `classic.Stop` blocks the stop one time when the session has denied calls and the reply has no `!` command.
// Each `Stop` clears the calls, so the block comes at most one time for each denied call.
//
// `claude plugin validate` follows `$` only into a function of one file.
// For this reason, each handler is here, and the rules are in `domain/`.

import type { Handler } from "../../../../../kernel/slice.ts";
import {
  blockReason,
  deniedCall,
  hasUserCommand,
} from "../domain/usercheck.ts";

/** The denied calls of each session, by `session_id`, since the last `Stop`. */
const denied = new Map<string, string[]>();

export const onPermissionDenied: Handler<"classic.PermissionDenied"> = async (
  _$,
  e,
  next,
) => {
  const calls = denied.get(e.session_id) ?? [];
  denied.set(e.session_id, [...calls, deniedCall(e)]);
  return next(e);
};

export const onStop: Handler<"classic.Stop"> = async (_$, e, next) => {
  const calls = denied.get(e.session_id) ?? [];
  denied.delete(e.session_id);
  const result = await next(e);
  if (
    calls.length === 0 ||
    e.stop_hook_active ||
    hasUserCommand(e.last_assistant_message)
  )
    return result;
  return { ...result, block: blockReason(calls) };
};
