// The `decide` option and the key of Jev. Nothing goes to Jev while the option is not `jev` or no key is set.

import type { PluginOptions } from "claude-code";

const MODES = ["off", "jev"] as const;

/** `off`: no tool. `jev`: the model can call the decision tool, which asks Jev. */
export type Mode = (typeof MODES)[number];

/** The mode for the `userConfig` values of the plugin. A missing or unknown value is `off`. */
export const modeOf = (options: PluginOptions): Mode =>
	MODES.find((m) => m === options["decide"]) ?? "off";

/** The sensitive option `TYPESAFE_API_KEY`, or `""`. */
export const keyOf = (options: PluginOptions): string => {
	const key = options["TYPESAFE_API_KEY"];
	return typeof key === "string" ? key : "";
};

/**
 * The key of Jev with the option `decide` set to `jev`: the option `TYPESAFE_API_KEY`, else the
 * exported variable of that name. Each `$.env.get` call needs a literal name, so the caller gives `env`.
 */
export const jevKey = async (
	options: PluginOptions,
	env: () => Promise<string | undefined>,
): Promise<string | undefined> => {
	if (modeOf(options) !== "jev") {
		return undefined;
	}
	const key = keyOf(options) || (await env());
	return key === "" ? undefined : key;
};

const kept: { options: PluginOptions } = { options: {} };

/** Keeps the options `register` was given, because the hooks are registered by reference and close over nothing. */
export const keepOptions = (options: PluginOptions): void => {
	kept.options = options;
};

/** The options `keepOptions` kept, or none before `register` ran. */
export const keptOptions = (): PluginOptions => kept.options;
