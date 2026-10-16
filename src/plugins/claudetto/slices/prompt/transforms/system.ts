import {
  SYSTEM_ALL_TEXT_YOU_OUTPUT,
  SYSTEM_COMPACTION_OFF,
  SYSTEM_HANDOFF_CARRIES,
  SYSTEM_TEXT_INSIDE_PASTED_CONTENT,
  SYSTEM_THE_SYSTEM_MAY_SEND,
  SYSTEM_THE_SYSTEM_WILL_AUTOMATICALLY,
  SYSTEM_TOOL_RESULTS_MAY_INCLUDE,
  SYSTEM_TOOLS_ARE_EXECUTED_IN,
  SYSTEM_USERS_MAY_CONFIGURE_HOOKS,
} from "../prompts.ts";
import type { CompactionState } from "./context_management.ts";
import { applyParts, type Part } from "./parts.ts";

const COMPRESS_ANCHOR = /^ - The system will automatically compress.*$/gm;

// The first parts hold for each state, and the last part is the line about the compression of earlier messages.
const COMMON: readonly Part[] = [
  {
    anchor: /^ - All text you output outside of tool use.*$/gm,
    text: SYSTEM_ALL_TEXT_YOU_OUTPUT,
  },
  {
    anchor: /^ - Tools are executed in a user-selected permission mode.*$/gm,
    text: SYSTEM_TOOLS_ARE_EXECUTED_IN,
  },
  {
    anchor: /^ - The system may send updates, reminders.*$/gm,
    text: SYSTEM_THE_SYSTEM_MAY_SEND,
  },
  {
    anchor: /^ - Tool results may include data.*$/gm,
    text: SYSTEM_TOOL_RESULTS_MAY_INCLUDE,
  },
  {
    anchor: /^ - Text inside <pasted_content> tags.*$/gm,
    text: SYSTEM_TEXT_INSIDE_PASTED_CONTENT,
  },
  {
    anchor: /^ - Users may configure 'hooks'.*$/gm,
    text: SYSTEM_USERS_MAY_CONFIGURE_HOOKS,
  },
];

/** The text of the compression line for each compaction state, which agrees with the `context_management` section. */
const COMPRESS_OF: Readonly<Record<CompactionState, string>> = {
  "built-in": SYSTEM_THE_SYSTEM_WILL_AUTOMATICALLY,
  handoff: SYSTEM_HANDOFF_CARRIES,
  off: SYSTEM_COMPACTION_OFF,
};

/** The parts for `state`. */
const partsOf = (state: CompactionState): readonly Part[] => [
  ...COMMON,
  { anchor: COMPRESS_ANCHOR, text: COMPRESS_OF[state] },
];

/** The parts of the built-in state, which the adapter uses to name an anchor that finds nothing. */
export const PARTS: readonly Part[] = partsOf("built-in");

export const transform = (
  text: string,
  state: CompactionState = "built-in",
): string => applyParts(text, partsOf(state));
