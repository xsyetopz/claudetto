// Which path answers a compaction (spec `compaction-path`, requirement "Default Path").
// The built-in path is the default until a probe result is accepted, because every round of the paid
// probe reported "No winner" against the decision rule (`docs/evidence/code-compaction-probe.md`).
// The code path is reachable only when the user sets it, so `auto` can never pick an unproven path.

import type { PluginOptions } from "claude-code";

/** The `userConfig` key of the plugin that names the path. */
export const COMPACTION_OPTION = "compaction";

/** Claude Code compacts, and the handoff is written before it from `classic.PreCompact`. */
export const BUILT_IN = "built-in";

/** Claudetto answers `session.compact` with a handoff that code builds, with no model request. Experimental. */
export const CODE = "code";

/** The value that leaves the choice to claudetto. It resolves to the built-in path. */
export const AUTO = "auto";

/** The values that the option declaration of `plugin.json` offers, in the order it offers them. */
export const COMPACTION_VALUES = [AUTO, BUILT_IN, CODE] as const;

/** The two paths a compaction can take; `AUTO` is not one, because `pathOf` resolves it to `BUILT_IN`. */
export type Path = typeof BUILT_IN | typeof CODE;

/** The `userConfig` values of the plugin, as the harness hands them to `register`. */
export type Options = PluginOptions;

/**
 * The path for `options`. Only an explicit `code` gives the code path, so `auto`, an absent option,
 * and any value the declaration does not offer all give the built-in path.
 */
export const pathOf = (options: Options | undefined): Path =>
	options?.[COMPACTION_OPTION] === CODE ? CODE : BUILT_IN;
