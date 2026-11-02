import type { PluginOptions } from "claude-code";

/** About 2,000 tokens: room for a runner's banner, its summary, and a few failures, and far under a 100,000-character log. */
export const DEFAULT_OUTPUT_CHARS = 8000;

/** `0` is off; an unset or invalid value is the default. */
export const outputLimit = (options: PluginOptions): number => {
	const value = options["maxTestOutputChars"];
	const n = typeof value === "string" ? Number(value) : value;
	return typeof n === "number" && Number.isInteger(n) && n >= 0
		? n
		: DEFAULT_OUTPUT_CHARS;
};
