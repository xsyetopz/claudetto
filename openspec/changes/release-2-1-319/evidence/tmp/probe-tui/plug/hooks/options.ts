import type { PluginOptions } from "claude-code";

/** The host fills an option nobody set with an empty string, so a value that is no number, or below `min`, is the fallback. */
export const numberOption = <F>(
	options: PluginOptions,
	key: string,
	fallback: F,
	min = 1,
): number | F => {
	const value = options[key];
	const n = typeof value === "string" && value !== "" ? Number(value) : value;
	return typeof n === "number" && Number.isFinite(n) && n >= min ? n : fallback;
};

/** A switch is on unless the user set `false`. */
export const switchOption = (options: PluginOptions, key: string): boolean =>
	options[key] !== false && options[key] !== "false";

export const stringOption = (options: PluginOptions, key: string): string => {
	const value = options[key];
	return typeof value === "string" ? value : "";
};
