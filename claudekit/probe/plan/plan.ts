// The forks of the probe: two arms that differ only in the compaction threshold, forked from one prepared base session per size.

import {
	CONTEXT_WINDOW,
	HANDOFF_TRIGGER_TOKENS,
	PLUGIN_DIR,
	pctFor,
} from "../../plugin.ts";
import { FINISH_PROMPT } from "../fixture/fixture.ts";
import type { Arm } from "../round/result.ts";

/**
 * The models a run may use. The probe compares thresholds, so one model holds for every arm and for the base session,
 * and a typo in a model id is otherwise a paid run that measures the wrong thing.
 */
export const MODELS = [
	"claude-sonnet-5-5",
	"claude-haiku-5-5",
	"claude-opus-5-5",
] as const;

/** The model of a run when `--model` is not given; it is one of `MODELS`. */
export const DEFAULT_MODEL = "claude-sonnet-5-5";

/** The candidate threshold when `--alt-threshold` is not given: the low end of the range that `docs/evidence/compaction/threshold.md` tests. */
export const DEFAULT_ALT_THRESHOLD = 100_000;

/**
 * The base size when `--sizes` is not given, as the context in tokens that the base is meant to end at.
 * The base must end under both thresholds, or both arms compact at the first request, and it must leave
 * the fork short enough of the higher threshold that the fork's own work crosses it: 91,500 plus the
 * measured 2,400 tokens a task reaches 140,000 at about the twentieth of 28 tasks (`FORK_NOTES`).
 */
export const DEFAULT_SIZES = [90_000];

/** A cap for each step, so that a loop stops (a safety stop, not the cost of a round). It counts the cost of the step only. */
const STEP_BUDGET_USD = "5";

/** One planned fork of the probe: its arm, base size, run number, and the model, env, and arguments of its one `claude` step. */
export interface Fork {
	arm: Arm;
	size: number;
	run: number;
	/** The prompt tokens at which this fork compacts. */
	threshold: number;
	model: string;
	/** The env that sets the threshold: the only thing that differs between the arms. */
	env: Record<string, string>;
	/** The arguments of the one `claude` step of the fork. `$BASE` is the base session of the size. */
	command: string[];
}

/** The env that puts the compaction of the window claudetto sets at `threshold`, by the same formula the plugin writes. */
export const envOf = (
	threshold: number,
): {
	CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: string;
	CLAUDE_CODE_AUTO_COMPACT_WINDOW: string;
} => ({
	CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: pctFor(CONTEXT_WINDOW, threshold).toFixed(4),
	CLAUDE_CODE_AUTO_COMPACT_WINDOW: String(CONTEXT_WINDOW),
});

/**
 * The flags of every step, the base session included. The threshold rides the `--settings` object and
 * not the process environment alone, because a settings `env` block replaces the value from the
 * shell, and this machine's own `~/.claude/settings.json` sets
 * `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` to `80.3571` under `env`. Passed only as an exported variable,
 * every fork would compact at that one threshold and the round would measure nothing. `--settings` is
 * the second level and user settings the fifth, so this value wins
 * (`clawdipedia` `configure/settings`, "Which Value Wins", read 2026-10-29). `envOf` is the single
 * source for both places, so the two cannot drift.
 *
 * `options` adds to the plugin's options, so a run can turn a shipped switch on for its own steps.
 * `compaction` is set here and not by a caller, because every run of this harness measures the
 * built-in path and a run that changed it would measure something else.
 */
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

/** The threshold of each arm: the one claudetto ships, and the candidate. */
export const thresholdsOf = (alt: number): Record<Arm, number> => ({
	ref: HANDOFF_TRIGGER_TOKENS,
	alt,
});

/** The forks, `runs` of each arm at each size, interleaved by run so that a drift in time hits both arms. */
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
