// The forks of the probe: the flags of each arm, and the commands of each size and run.

import path from "node:path";
import { type Arm, MIN_RUNS, SIZES } from "./bar.ts";
import { hopPrompts } from "./fixture.ts";

const MODEL = "claude-sonnet-5-5";
/** An absolute path, because each run starts in a temp folder. */
const PLUGIN = path.join(import.meta.dir, "../../plugins/claudetto");
/** The `compaction` option of each arm. */
const OPTION: Record<Arm, string> = { B: "built-in", C: "code", H: "handover" };
/** A cap for each step, so that a loop stops (a safety stop, not the cost of a round). It counts the cost of the step only. */
const STEP_BUDGET_USD = "5";

export interface Fork {
	arm: Arm;
	size: number;
	run: number;
	commands: string[][];
}

/** The follow-up prompts of `arm`. The resume turn of H does task 1.4, so H gets only the 1.5 prompt and does the same work as B and C. */
export const hopsOf = (arm: Arm): string[] =>
	arm === "H" ? hopPrompts.slice(1) : hopPrompts;

export const flags = (arm: Arm): string[] => [
	"--model",
	MODEL,
	"--plugin-dir",
	PLUGIN,
	"--settings",
	JSON.stringify({
		pluginConfigs: {
			"claudetto@inline": { options: { compaction: OPTION[arm] } },
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

/** The forks, `runs` of each arm and size. `$BASE` is the base session of the size, `$FORK` is the session that the last step ended in, and `$HANDOFF` is the resume prompt of H. */
export const plan = (runs = MIN_RUNS): Fork[] =>
	SIZES.flatMap((size) =>
		(["B", "C", "H"] as const).flatMap((arm) =>
			Array.from({ length: runs }, (_, i) => ({
				arm,
				size,
				run: i + 1,
				commands: [
					arm === "H"
						? ["-p", "$HANDOFF", ...flags(arm)]
						: [
								"-p",
								"/compact",
								"--resume",
								"$BASE",
								"--fork-session",
								...flags(arm),
							],
					...hopsOf(arm).map((p) => [
						"-p",
						p,
						"--resume",
						"$FORK",
						...flags(arm),
					]),
				],
			})),
		),
	);
