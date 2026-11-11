import type { ModelEffort, PluginOptions } from "claude-code";

export interface Settings {
	readonly model: string;
	readonly effort: ModelEffort;
}

const EFFORTS: readonly ModelEffort[] = [
	"low",
	"medium",
	"high",
	"xhigh",
	"max",
];

export const settingsOf = (options: PluginOptions): Settings => {
	const model = options["sideCheckModel"];
	return {
		model:
			typeof model === "string" && model !== "" ? model : "claude-haiku-5-5",
		effort:
			EFFORTS.find((e) => e === options["sideCheckEffortLevel"]) ?? "high",
	};
};
