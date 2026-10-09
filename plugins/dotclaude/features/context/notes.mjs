// The text of the context note of design D32 (spec context-bound).
// The handoff steps are here and not in the output style, so that a session that reaches no level does not pay for them.

import { CONTEXT_WINDOW } from "../../lib/budget.mjs";
import {
  CONTEXT_BLOCK_MARGIN,
  CONTEXT_HANDOFF_AT,
  HANDOFF_RESERVE,
} from "./limits.mjs";

/** The steps of a handoff, which end the turn. */
export const HANDOFF_STEPS = [
  "Do these steps, and then end the turn:",
  "1. Finish the current edit, and do not start a new edit.",
  "2. Make sure that each file has no incomplete edit.",
  "3. In `tasks.md` of the OpenSpec change, mark each task whose check passed in this session.",
  "4. Put the decisions of the chat in `design.md` of the change.",
  "5. In the last message, write the command that continues the work, such as `/opsx:apply <change>`, and tell the user to run `/clear` first.",
  "When the project has no OpenSpec change, write the same data in the last message.",
].join("\n");

/**
 * The note for `level` (from `contextLevel`), or `undefined` when there is none.
 * `off` is true when compaction is off.
 */
export function noteText(level, { off = false } = {}) {
  if (!level) return undefined;
  const head = `The context of this session is ${level.tokens} tokens, which is ${Math.round(level.share)}% of ${CONTEXT_WINDOW}. ${off ? "Compaction is off, so the session stops before the context is full and gives you no last turn." : "Compaction runs before the context is full, and it can lose detail."}`;
  const block = CONTEXT_WINDOW - CONTEXT_BLOCK_MARGIN;
  const rest = Math.max(0, block - level.tokens);
  if (level.step === "handoff")
    return `${head} The context limit of the client is ${block} tokens, which is ${rest} tokens from now. Stop the work now, and do the handoff steps.\n${HANDOFF_STEPS}`;
  const room = Math.max(0, rest - HANDOFF_RESERVE);
  return [
    head,
    `The context limit of the client is ${block} tokens, which is ${rest} tokens from now.`,
    `The handoff steps come at ${CONTEXT_HANDOFF_AT}%, but one large tool result can go past that level directly to the limit.`,
    `The handoff steps need ${HANDOFF_RESERVE} tokens, so ${room} tokens are now free for work.`,
    "Before each slice, estimate its tokens. A full read of a large file can use 40K tokens.",
    "Start the slice only when it fits in the free tokens that are left. Else do not start it, and tell the user in the last message that the context is near its limit.",
  ].join(" ");
}
