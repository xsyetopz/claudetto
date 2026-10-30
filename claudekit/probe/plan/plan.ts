import {
	CONTEXT_WINDOW,
	HANDOFF_TRIGGER_TOKENS,
	PLUGIN_DIR,
	pctFor,
} from "../../plugin.ts";
import { FINISH_PROMPT } from "../fixture/fixture.ts";
import type { Arm } from "../round/result.ts";

export const MODELS = [
	"claude-sonnet-5-5",
	"claude-haiku-5-5",
	"claude-opus-5-5",
] as const;

export const DEFAULT_MODEL = "claude-sonnet-5-5";

export const DEFAULT_ALT_THRESHOLD = 100_000;

export const DEFAULT_SIZES = [90_000];

const STEP_BUDGET_USD = "5";

export interface Fork {
	arm: Arm;
	size: number;
	run: number;
	threshold: number;
	model: string;
	env: Record<string, string>;
	command: string[];
}

export const envOf = (
	threshold: number,
): {
	CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: string;
	CLAUDE_CODE_AUTO_COMPACT_WINDOW: string;
} => ({
	CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: pctFor(CONTEXT_WINDOW, threshold).toFixed(4),
	CLAUDE_CODE_AUTO_COMPACT_WINDOW: String(CONTEXT_WINDOW),
});

export const flags = (
	model: string,
	threshold: number,
	options: Readonly<Record<string, string>> = {},
): string[] => [
	"--model",
	model,
	"--plugin-dir",
	PLUGIN_DIR,
	"--settings",
	JSON.stringify({
		env: envOf(threshold),
		autoCompactWindow: CONTEXT_WINDOW,
		pluginConfigs: {
			"claudetto@inline": {
				options: { compaction: "built-in", ...options },
			},
		},
	}),
	"--permission-mode",
	"acceptEdits",
	"--max-budget-usd",
	STEP_BUDGET_USD,
	"--output-format",
	"stream-json",
	"--verbose",
];

export const thresholdsOf = (alt: number): Record<Arm, number> => ({
	ref: HANDOFF_TRIGGER_TOKENS,
	alt,
});

export const plan = (
	runs: number,
	model: string,
	alt: number,
	sizes: number[],
): Fork[] => {
	const thresholds = thresholdsOf(alt);
	return sizes.flatMap((size) =>
		Array.from({ length: runs }, (_, i) =>
			(["ref", "alt"] as const).map(
				(arm): Fork => ({
					arm,
					size,
					run: i + 1,
					threshold: thresholds[arm],
					model,
					env: envOf(thresholds[arm]),
					command: [
						"-p",
						FINISH_PROMPT,
						"--resume",
						"$BASE",
						"--fork-session",
						...flags(model, thresholds[arm]),
					],
				}),
			),
		).flat(),
	);
};
