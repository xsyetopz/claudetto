import type { PluginOptions } from "claude-code";

const MODES = ["off", "jev"] as const;

export type Mode = (typeof MODES)[number];

export const modeOf = (options: PluginOptions): Mode =>
	MODES.find((m) => m === options["decide"]) ?? "off";

export const keyOf = (options: PluginOptions): string => {
	const key = options["TYPESAFE_API_KEY"];
	return typeof key === "string" ? key : "";
};

/** Each `$.env.get` call needs a literal name, so the caller gives `env`. */
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
