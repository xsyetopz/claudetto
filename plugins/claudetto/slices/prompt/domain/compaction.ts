// The compaction gate of the prompt (spec `prompt-profile`, "Compaction gate"):
// the `context_management` block of the context agrees with the compaction state of the session.
// With the handoff on, no text says that the context is compacted.
// With the compaction profile on, no text says that the context is handed over.
// The body of `claudetto:main` is the same in each session, so this block carries the text that changes.

import type { PluginOptions } from "claude-code";
import { isBuiltInCompaction } from "../../../kernel/compaction.ts";
import {
  CONTEXT_MANAGEMENT_BUILT_IN,
  CONTEXT_MANAGEMENT_HANDOFF,
  CONTEXT_MANAGEMENT_OFF,
} from "../prompts.ts";

export type CompactionState = "handoff" | "built-in" | "off";

export const CONTEXT_BLOCK = "context_management";

/** True when an env value turns a switch on: set, and not `0` or `false`. */
const isOn = (value: string | undefined) =>
  value !== undefined && value !== "" && value !== "0" && value !== "false";

/** The state from the `userConfig` values of the plugin and the value of `DISABLE_COMPACT`. */
export const compactionState = (
  options: PluginOptions | undefined,
  disableCompact: string | undefined,
): CompactionState => {
  if (isOn(disableCompact)) return "off";
  return isBuiltInCompaction(options) ? "built-in" : "handoff";
};

export const CONTEXT_TEXT: Readonly<Record<CompactionState, string>> = {
  handoff: CONTEXT_MANAGEMENT_HANDOFF.trim(),
  "built-in": CONTEXT_MANAGEMENT_BUILT_IN.trim(),
  off: CONTEXT_MANAGEMENT_OFF.trim(),
};
