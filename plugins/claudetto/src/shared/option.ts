import type { PluginOptions } from "claude-code";

type OptionValue = PluginOptions[string];

/** The host fills an option nobody set with an empty string, so an empty string counts as unset. */
const isUnset = (value: OptionValue | undefined): boolean =>
	value === undefined || value === "";

/** The value of option `name`, else the one stored under `legacy`, the name it had before it was renamed. */
export const optionOf = (
	options: PluginOptions,
	name: string,
	legacy: string,
): OptionValue | undefined =>
	isUnset(options[name]) ? options[legacy] : options[name];

/**
 * For an option with a default: the host fills the default in, so the new name at the default cannot tell a choice from
 * a fill, and a value stored under `legacy` wins over it.
 */
export const optionOverDefault = (
	options: PluginOptions,
	name: string,
	legacy: string,
	fallback: OptionValue,
): OptionValue | undefined => {
	const value = options[name];
	return isUnset(value) || value === fallback
		? (options[legacy] ?? value)
		: value;
};
