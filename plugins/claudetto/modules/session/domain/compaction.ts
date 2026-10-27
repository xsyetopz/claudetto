// The `compaction` option (`auto`, `handover`, `built-in`, or `code`) that the `handoff` slice declares. No runtime import.

import type { PluginOptions } from "claude-code";

export const COMPACTION_OPTION = "compaction";

/** The value that leaves compaction to Claude Code. */
export const BUILT_IN_COMPACTION = "built-in";

export const isBuiltInCompaction = (options: PluginOptions | undefined) =>
	options?.[COMPACTION_OPTION] === BUILT_IN_COMPACTION;

/** The value that answers `session.compact` with a handoff that code builds, and makes no model request. */
export const CODE_COMPACTION = "code";

export const isCodeCompaction = (options: PluginOptions | undefined) =>
	options?.[COMPACTION_OPTION] === CODE_COMPACTION;
