// The plugin ships off, and every hook reads `sideCheckEnabled` first, so an installed copy costs nothing.

import type { ModelEffort, PluginOptions } from "claude-code";

/** A check is the same kind of work as a summary, so it takes the summary's model. */
export const DEFAULT_MODEL = "claude-haiku-5-5";

/** Must equal the manifest's `default`, which reaches the hook as the option's value. */
export const DEFAULT_EFFORT: ModelEffort = "high";

const EFFORTS: readonly ModelEffort[] = [
	"low",
	"medium",
	"high",
	"xhigh",
	"max",
];

/** The plugin ships off, so `sideCheckEnabled` is false until the person sets it. */
export interface Settings {
	readonly enabled: boolean;
	readonly model: string;
	readonly effort: ModelEffort;
}

/** The host fills a default in, so a value stored under the name an option had before its rename wins over the new name at its default. */
const overDefault = (
	options: PluginOptions,
	name: string,
	legacy: string,
	fallback: string,
): unknown => {
	const value = options[name];
	return value === undefined || value === fallback
		? (options[legacy] ?? value)
		: value;
};

/** Only `true` turns the plugin on, under the new name or the one stored before the rename. */
export const settingsOf = (options: PluginOptions): Settings => {
	const model = overDefault(options, "sideCheckModel", "model", DEFAULT_MODEL);
	const effort = overDefault(
		options,
		"sideCheckEffortLevel",
		"effort",
		DEFAULT_EFFORT,
	);
	return {
		enabled:
			options["sideCheckEnabled"] === true || options["enabled"] === true,
		model: typeof model === "string" && model !== "" ? model : DEFAULT_MODEL,
		effort: EFFORTS.find((e) => e === effort) ?? DEFAULT_EFFORT,
	};
};

const kept: { settings: Settings } = { settings: settingsOf({}) };

/** The hooks are registered by reference and close over nothing, so the options are kept here. */
export const keepOptions = (options: PluginOptions): void => {
	kept.settings = settingsOf(options);
};

export const keptSettings = (): Settings => kept.settings;
