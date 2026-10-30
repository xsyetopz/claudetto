// The paid half of the compaction price: a session of `claude -p` steps whose threshold is pinned low,
// so one step crosses it and the recorder marks the row that follows. With no `--run` it makes no call.
//
// Why steps rather than one session: a `-p` step is one turn and leaves one end-of-session row, so the
// row of a step is that step's own delta. A step that carried the compaction less a plain step is the
// compaction's price. A whole fork of `claudekit/probe/` cannot give it, because its one row covers the fork.

import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { ROWS_KEY, rowsOf } from "../plugin.ts";
import { eachInOrder } from "../probe/fixture/ordered.ts";
import { DEFAULT_MODEL, envOf, flags, MODELS } from "../probe/plan/plan.ts";
import { exec } from "../probe/transport/claude.ts";
import {
	contextOf,
	last,
	problem,
	type Step,
} from "../probe/transport/events.ts";
import { storedAt, storeFiles } from "../store.ts";
import { priceLine, priceOf } from "./price.ts";

/**
 * The tokens one step adds to the context, measured and not assumed: the run of 2026-10-30 grew 1,145,
 * 1,135, 1,145, 1,135, and 1,137 tokens over its six steps. The notes are almost none of it, because a
 * step that needs one line of a note reads that line with a `limit`, which is the finding of
 * `docs/evidence/compaction/threshold.md`: a fixture cannot buy context by putting it in a file.
 */
export const STEP_GROWTH_TOKENS = 1139;

/**
 * How many steps of growth the threshold sits above the first step's context. It has to be at least one,
 * so that step one does not compact and leaves a row to price the marked one against, and at most the
 * step count less two, so that a plain step still follows the compaction. Two is the middle of that
 * band at the default step count, and it holds while the real growth is anywhere from half the measured
 * figure to four times it.
 */
const CROSS_AFTER_STEPS = 2;

/** The steps of the run. Three is the least that leaves a plain step on either side of the marked one. */
const DEFAULT_STEPS = 6;

const MIN_STEPS = 3;

/** The threshold of the calibration step, high enough that it cannot compact whatever the context is. */
const NO_COMPACT_THRESHOLD = 1_000_000;

/** What one step of this run costs, from the run of 2026-10-30 which billed 0.2811 over its six steps. */
const STEP_USD = 0.047;

const USAGE = `Usage: bun claudekit/compaction-price/main.ts [--run] [--steps N] [--threshold T] [--model M] [--dir D] [--cheap-summary]
With no --run it is a dry run: it prints the plan and the expected cost, and makes no call.
--cheap-summary turns the plugin's own summarizer handler on for the run, so two runs price it against the engine's compaction.
--run makes the paid calls. N is a whole number of at least ${MIN_STEPS} (default ${DEFAULT_STEPS}), and M is one of ${MODELS.join(", ")} (default ${DEFAULT_MODEL}).
T is the compaction threshold in tokens. With no --threshold the run calibrates it: one extra step measures the context that the plugin's own prompt and one note produce, and the threshold is set ${CROSS_AFTER_STEPS} steps of growth above it. A fixed figure cannot do that, because the context of a first step is almost all the plugin's prompt and moves with it.`;

/** The parsed command line of a run: whether it is paid, the step count, the compaction threshold in tokens or none to calibrate it, the model id, and the working folder. */
export interface Config {
	paid: boolean;
	steps: number;
	threshold: number | undefined;
	model: string;
	dir: string;
	/** Whether the run turns the plugin's `cheapSummary` handler on, which is the arm to compare. */
	cheapSummary: boolean;
}

/** The plugin options of a run: the `cheapSummary` switch when the arm asks for it, else none. */
export const optionsOf = (c: Config): Record<string, string> =>
	c.cheapSummary ? { cheapSummary: "on" } : {};

/** The threshold to pin a run at, given the context its first step reached. */
export const thresholdFor = (context: number): number =>
	context + CROSS_AFTER_STEPS * STEP_GROWTH_TOKENS;

const numberOf = (text: string | undefined, least: number): number => {
	const value = Number(text);
	if (!Number.isInteger(value) || value < least) {
		throw new Error(USAGE);
	}
	return value;
};

/** The config of `argv`, or a usage error. */
export const configOf = (argv: string[]): Config => {
	const at = (flag: string): string | undefined => {
		const i = argv.indexOf(flag);
		return i < 0 ? undefined : argv[i + 1];
	};
	const model = at("--model") ?? DEFAULT_MODEL;
	if (!MODELS.some((m) => m === model)) {
		throw new Error(USAGE);
	}
	return {
		paid: argv.includes("--run"),
		steps: argv.includes("--steps")
			? numberOf(at("--steps"), MIN_STEPS)
			: DEFAULT_STEPS,
		threshold: argv.includes("--threshold")
			? numberOf(at("--threshold"), 1)
			: undefined,
		model,
		dir: at("--dir") ?? path.join(process.cwd(), ".compaction-price"),
		cheapSummary: argv.includes("--cheap-summary"),
	};
};

/** One note of about 6,000 tokens, with a code on its first line so a step has something to report. */
const note = (i: number): string =>
	[
		`Code ${i}: ${String((i * 7919) % 1_000_000).padStart(6, "0")}`,
		...Array.from({ length: 300 }, (_, n) =>
			`Note ${i}.${n}: the build step ${(i * 7 + n) % 97} keeps the cache ${(n * 13) % 89} warm.`.padEnd(
				80,
				" .",
			),
		),
	].join("\n");

const partName = (i: number): string => `part-${String(i).padStart(2, "0")}.md`;

const stepPrompt = (i: number): string =>
	`Read \`notes/${partName(i)}\`, one \`Read\` call. Then say the number on its first line and nothing else.`;

/** The rows of the newest store of the in-tree plugin, or none when no store holds any. */
export const storeRows = async (home: string) => {
	const files = await storeFiles(home);
	return files
		.flatMap((f) => rowsOf(storedAt(f, ROWS_KEY)))
		.toSorted((l, r) => l.at - r.at);
};

/**
 * The threshold of the run, from `--threshold` or from one calibration step. The step runs the same
 * prompt as the first step of the run, in its own session and with compaction off, so the context it
 * reports is the one the run itself starts from. It is a paid step and it is why the expected cost
 * counts one step more than the run has.
 *
 * It runs without the arm's own options. The step cannot compact, so the summarizer handler could not
 * fire in it anyway, and leaving the options off makes the calibration identical in both arms, which
 * is what lets the two runs be compared at the same threshold.
 */
const thresholdOf = async (c: Config): Promise<number> => {
	if (c.threshold !== undefined) {
		return c.threshold;
	}
	const step = await exec(
		["-p", stepPrompt(0), ...flags(c.model, NO_COMPACT_THRESHOLD)],
		c.dir,
		{ ...envOf(NO_COMPACT_THRESHOLD), DISABLE_AUTO_COMPACT: "1" },
	);
	const why = problem([step], 0);
	if (why) {
		throw new Error(`calibration step: ${why}`);
	}
	const context = contextOf(step.events);
	const threshold = thresholdFor(context);
	process.stdout.write(
		`The calibration step reached ${context} tokens, so the run compacts at ${threshold}.\n`,
	);
	return threshold;
};

const runSteps = async (c: Config): Promise<Step[]> => {
	await mkdir(path.join(c.dir, "notes"), { recursive: true });
	await Promise.all(
		Array.from({ length: c.steps }, (_, i) =>
			writeFile(path.join(c.dir, "notes", partName(i)), note(i)),
		),
	);
	const threshold = await thresholdOf(c);
	const id = crypto.randomUUID();
	const steps: Step[] = [];
	// One after another, because each step resumes the session that the step before it left.
	await eachInOrder(
		Array.from({ length: c.steps }, (_, i) => i),
		async (i) => {
			steps.push(
				await exec(
					[
						"-p",
						stepPrompt(i),
						...(i === 0 ? ["--session-id", id] : ["--resume", id]),
						...flags(c.model, threshold, optionsOf(c)),
					],
					c.dir,
					envOf(threshold),
				),
			);
			const why = problem(steps, 0);
			if (why) {
				throw new Error(`step ${i + 1}: ${why}`);
			}
		},
	);
	return steps;
};

/** The paid steps of a run. `main` takes it as an argument so a test can run the whole wiring unpaid. */
export type Runner = (c: Config) => Promise<Step[]>;

/** Runs the plan and prints the step count, threshold, and expected cost in `total_cost_usd` units; with no `--run` it makes no call, otherwise it runs the steps and prints the billed total and the price line. */
export const main = async (
	argv: string[],
	home: string,
	run: Runner = runSteps,
): Promise<void> => {
	const c = configOf(argv);
	// The calibration step is counted in the price, because it is a paid call like any other step.
	const paidSteps = c.steps + (c.threshold === undefined ? 1 : 0);
	const at =
		c.threshold === undefined
			? `compacting at a threshold calibrated from one extra step, ${CROSS_AFTER_STEPS} steps of growth above the context it reads`
			: `compacting at ${c.threshold} tokens (${envOf(c.threshold).CLAUDE_AUTOCOMPACT_PCT_OVERRIDE}% of ${envOf(c.threshold).CLAUDE_CODE_AUTO_COMPACT_WINDOW})`;
	const arm = c.cheapSummary
		? "the plugin's cheapSummary handler"
		: "the engine's own compaction";
	process.stdout.write(
		`${c.steps} steps on ${c.model}, ${at}, summarized by ${arm}.\nExpected cost ${(paidSteps * STEP_USD).toFixed(2)} in the units of total_cost_usd.\n`,
	);
	if (!c.paid) {
		process.stdout.write("No call made. Add --run to make the paid calls.\n");
		return;
	}
	const since = Date.now();
	const steps = await run(c);
	const cost = last(steps.at(-1)?.events ?? []).total_cost_usd ?? 0;
	process.stdout.write(`The run billed ${cost} in total.\n`);
	process.stdout.write(`${priceLine(priceOf(await storeRows(home), since))}\n`);
};

if (import.meta.main) {
	await main(process.argv.slice(2), homedir());
}
