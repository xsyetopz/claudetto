// The `userConfig` values of the plugin: whether it is on, which model answers a check, and how hard
// that model thinks. The plugin ships off, and every hook reads `enabled` first, so an installed copy
// costs nothing until the person turns it on.

import type { ModelEffort, PluginOptions } from "claude-code";

/**
 * The model of a check. `docs/models.md:9-15` is the one table of this tree that assigns a model to a
 * role: its last row gives a handoff or a summary to this model at this effort, and a check is the
 * same kind of work, a short read of recent work that ends in a few lines. The person may name
 * another in the options.
 */
export const DEFAULT_MODEL = "claude-haiku-5-5";

/**
 * The effort of the row of `docs/models.md:15`, which is `medium`, and the fallback for an effort
 * that is not a level. It must stay the `default` the manifest declares, because that default
 * reaches the hook as the option's value and the fallback below never fires: this constant said
 * `high` while the manifest said `medium`, so it described a default nobody got.
 * `tests/repo/manifests.test.ts` pins the two together.
 */
export const DEFAULT_EFFORT: ModelEffort = "medium";

const EFFORTS: readonly ModelEffort[] = [
	"low",
	"medium",
	"high",
	"xhigh",
	"max",
];

/** The settings of the plugin: the plugin ships off, so `enabled` is false until the person sets it. */
export interface Settings {
	readonly enabled: boolean;
	readonly model: string;
	readonly effort: ModelEffort;
}

/** The settings for the `userConfig` values. Only `true` turns the plugin on. */
export const settingsOf = (options: PluginOptions): Settings => {
	const model = options["model"];
	return {
		enabled: options["enabled"] === true,
		model: typeof model === "string" && model !== "" ? model : DEFAULT_MODEL,
		effort: EFFORTS.find((e) => e === options["effort"]) ?? DEFAULT_EFFORT,
	};
};

const kept: { settings: Settings } = { settings: settingsOf({}) };

/** Keeps what `register` was given, because the hooks are registered by reference and close over nothing. */
export const keepOptions = (options: PluginOptions): void => {
	kept.settings = settingsOf(options);
};

/** The settings `keepOptions` kept, or the plugin off before `register` ran. */
export const keptSettings = (): Settings => kept.settings;
