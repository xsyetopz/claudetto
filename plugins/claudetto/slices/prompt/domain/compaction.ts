// The compaction gate (spec `prompt-profile`): the `context_management` block agrees with the compaction state, so no text says "compacted" with the handoff on or "handed over" with built-in compaction on.

import type { PluginOptions } from "claude-code";
import { isBuiltInCompaction } from "../../../kernel/compaction.ts";
import {
  CONTEXT_MANAGEMENT_BUILT_IN,
  CONTEXT_MANAGEMENT_HANDOFF,
  CONTEXT_MANAGEMENT_OFF,
} from "../prompts.ts";

type CompactionState = "handoff" | "built-in" | "off";

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
