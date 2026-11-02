import type { PluginOptions } from "claude-code";
import { optionOf, optionOverDefault } from "../../shared/option.ts";

const MODES = ["off", "jev"] as const;

export type Mode = (typeof MODES)[number];

export const modeOf = (options: PluginOptions): Mode =>
	MODES.find(
		(m) => m === optionOverDefault(options, "decideProvider", "decide", "jev"),
	) ?? "off";

export const keyOf = (options: PluginOptions): string => {
	const key = optionOf(options, "typesafeApiKey", "TYPESAFE_API_KEY");
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
