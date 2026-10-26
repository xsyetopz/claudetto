// The `compaction` option (`auto`, `handover`, or `built-in`) that the `handoff` slice declares. No runtime import.

import type { PluginOptions } from "claude-code";

export const COMPACTION_OPTION = "compaction";

/** The value that leaves compaction to Claude Code. */
export const BUILT_IN_COMPACTION = "built-in";

export const isBuiltInCompaction = (options: PluginOptions | undefined) =>
  options?.[COMPACTION_OPTION] === BUILT_IN_COMPACTION;
