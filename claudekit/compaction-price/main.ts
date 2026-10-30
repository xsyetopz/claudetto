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

export const STEP_GROWTH_TOKENS = 1139;

/** At least one, so that step one does not compact; at most the step count less two. */
const CROSS_AFTER_STEPS = 2;

const DEFAULT_STEPS = 6;

const MIN_STEPS = 3;

const NO_COMPACT_THRESHOLD = 1_000_000;

const STEP_USD = 0.047;

const USAGE = `Usage: bun claudekit/compaction-price/main.ts [--run] [--steps N] [--threshold T] [--model M] [--dir D] [--cheap-summary]
With no --run it is a dry run: it prints the plan and the expected cost, and makes no call.
--cheap-summary turns the plugin's own summarizer handler on for the run, so two runs price it against the engine's compaction.
--run makes the paid calls. N is a whole number of at least ${MIN_STEPS} (default ${DEFAULT_STEPS}), and M is one of ${MODELS.join(", ")} (default ${DEFAULT_MODEL}).
T is the compaction threshold in tokens. With no --threshold the run calibrates it: one extra step measures the context that the plugin's own prompt and one note produce, and the threshold is set ${CROSS_AFTER_STEPS} steps of growth above it. A fixed figure cannot do that, because the context of a first step is almost all the plugin's prompt and moves with it.`;

export interface Config {
	paid: boolean;
	steps: number;
	threshold: number | undefined;
	model: string;
	dir: string;
	cheapSummary: boolean;
}

export const optionsOf = (c: Config): Record<string, string> =>
	c.cheapSummary ? { cheapSummary: "on" } : {};

export const thresholdFor = (context: number): number =>
	context + CROSS_AFTER_STEPS * STEP_GROWTH_TOKENS;

const numberOf = (text: string | undefined, least: number): number => {
	const value = Number(text);
	if (!Number.isInteger(value) || value < least) {
		throw new Error(USAGE);
	}
	return value;
};

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

export const storeRows = async (home: string) => {
	const files = await storeFiles(home);
	return files
		.flatMap((f) => rowsOf(storedAt(f, ROWS_KEY)))
		.toSorted((l, r) => l.at - r.at);
};

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

export type Runner = (c: Config) => Promise<Step[]>;

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
