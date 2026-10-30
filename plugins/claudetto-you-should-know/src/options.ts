// The plugin ships off, and every hook reads `enabled` first, so an installed copy costs nothing.

import type { ModelEffort, PluginOptions } from "claude-code";

/** A check is the same kind of work as a summary, so it takes the summary's model. */
export const DEFAULT_MODEL = "claude-haiku-5-5";

/** Must equal the manifest's `default`, which reaches the hook as the option's value. */
export const DEFAULT_EFFORT: ModelEffort = "medium";

const EFFORTS: readonly ModelEffort[] = [
	"low",
	"medium",
	"high",
	"xhigh",
	"max",
];

/** The plugin ships off, so `enabled` is false until the person sets it. */
export interface Settings {
	readonly enabled: boolean;
	readonly model: string;
	readonly effort: ModelEffort;
}

/** Only `true` turns the plugin on. */
export const settingsOf = (options: PluginOptions): Settings => {
	const model = options["model"];
	return {
		enabled: options["enabled"] === true,
		model: typeof model === "string" && model !== "" ? model : DEFAULT_MODEL,
		effort: EFFORTS.find((e) => e === options["effort"]) ?? DEFAULT_EFFORT,
	};
};

const kept: { settings: Settings } = { settings: settingsOf({}) };

/** The hooks are registered by reference and close over nothing, so the options are kept here. */
export const keepOptions = (options: PluginOptions): void => {
	kept.settings = settingsOf(options);
};

export const keptSettings = (): Settings => kept.settings;
