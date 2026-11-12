import type { ModelEffort, PluginOptions } from "claude-code";

/** The model IDs a side check may use; any other `sideCheckModel` falls back to the default. */
export const MODELS = [
	"claude-opus-5-5",
	"claude-sonnet-5-5",
	"claude-haiku-5-5",
] as const;

/** The effort levels a side check may use; any other `sideCheckEffortLevel` falls back to the default. */
export const EFFORTS = [
	"low",
	"medium",
	"high",
	"xhigh",
	"max",
] as const satisfies readonly ModelEffort[];

export interface Settings {
	readonly model: (typeof MODELS)[number];
	readonly effort: (typeof EFFORTS)[number];
}

/** The model and effort a side check uses: each option value inside `MODELS` and `EFFORTS`, else `claude-haiku-5-5` and `high`. */
export const settingsOf = (options: PluginOptions): Settings => ({
	model:
		MODELS.find((m) => m === options["sideCheckModel"]) ?? "claude-haiku-5-5",
	effort: EFFORTS.find((e) => e === options["sideCheckEffortLevel"]) ?? "high",
});
