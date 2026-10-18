// The count of earlier calls of `advise`, from the conversation: no state outside the session.

import type { SessionMessage } from "claude-code";
import { MAX_CALLS_PER_SESSION, MAX_CALLS_PER_TURN } from "../limits.ts";
import { ERROR_SESSION, ERROR_TURN } from "../prompts.ts";
import { TOOL_NAME } from "./tool.ts";

/** The text that refuses the call, or `undefined` when a call is left. `id` is the call itself, which the transcript may already hold. A turn starts at the last message of the user with text. */
export const refusal = (
  messages: readonly SessionMessage[],
  id: string,
): string | undefined => {
  const turn = messages.findLastIndex((m) => m.role === "user" && m.text);
  const count = (list: readonly SessionMessage[]) =>
    list
      .flatMap((m) => m.toolUses)
      .filter((t) => t.tool === TOOL_NAME && t.tool_use_id !== id).length;
  if (count(messages) >= MAX_CALLS_PER_SESSION) return ERROR_SESSION;
  if (count(messages.slice(Math.max(turn, 0))) >= MAX_CALLS_PER_TURN)
    return ERROR_TURN;
  return undefined;
};
