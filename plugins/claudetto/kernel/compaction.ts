// The `compaction` option of the core plugin, which the `handoff` slice declares and the `prompt` slice reads (spec `handoff`, "Opt-in compaction profile").
// This file has no runtime import, so the hooks module can load it.

import type { PluginOptions } from "claude-code";

/** The name of the `userConfig` option that chooses the handoff or the built-in compaction. */
export const COMPACTION_OPTION = "compaction";

export const BUILT_IN_COMPACTION = "built-in";

export const isBuiltInCompaction = (options: PluginOptions | undefined) =>
  options?.[COMPACTION_OPTION] === BUILT_IN_COMPACTION;
