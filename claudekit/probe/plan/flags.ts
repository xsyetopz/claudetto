// The command line of the probe. A value that does not parse is `null`, and the caller prints the usage and makes no call.

import os from "node:os";
import path from "node:path";
import {
	CONTEXT_WINDOW,
	compactAt,
	HANDOFF_TRIGGER_TOKENS,
} from "../../plugin.ts";
import { RESULTS_FILE } from "../round/saved.ts";
import { ROUND_BUDGET_USD } from "./cost.ts";
import { CITABLE_MIN_RUNS, DEFAULT_RUNS, SMOKE_MIN_RUNS } from "./floor.ts";
import {
	DEFAULT_ALT_THRESHOLD,
	DEFAULT_MODEL,
	DEFAULT_SIZES,
	MODELS,
} from "./plan.ts";

/** The parsed command line of the probe: the run mode, runs per arm, model, candidate threshold in tokens, base sizes in tokens, cost cap in dollars, and output folder. */
export interface Config {
	/** Whether the run is paid. Only `--run` sets it. */
	paid: boolean;
	/**
	 * Whether the run stops after the base sessions and runs no fork. It is how the paid path is
	 * exercised against a real `claude` for the price of one base rather than a whole round, and it is
	 * how the base size of `--sizes` is settled, because the base prints its measured context.
	 */
	baseOnly: boolean;
	/**
	 * Whether the run only reports the forks that `--dir` already holds, and makes no call. It is how a
	 * round that stopped at its cost cap, or that was killed, is still reported from what it paid for.
	 */
	report: boolean;
	runs: number;
	model: string;
	alt: number;
	sizes: number[];
	cap: number;
	dir: string;
}

/** The value after `flag`, `undefined` without the flag, or `null` when the flag ends the line. */
const rawValue = (args: string[], flag: string): string | undefined | null => {
	const at = args.indexOf(flag);
	if (at < 0) {
		return undefined;
	}
	return args[at + 1] ?? null;
};

/** `read` of the value of `flag`, or `fallback` without the flag, or `null` when the value does not parse. */
const flagged = <T>(
	args: string[],
	flag: string,
	fallback: T,
	read: (text: string) => T | null,
): T | null => {
	const text = rawValue(args, flag);
	if (text === undefined) {
		return fallback;
	}
	return text === null ? null : read(text);
};

const wholeAbove = (text: string, floor: number): number | null => {
	const n = Number(text);
	return Number.isInteger(n) && n >= floor ? n : null;
};

/** The usage text printed when a value does not parse, with the defaults and limits of each flag. */
export const USAGE = `Usage: bun claudekit/probe/main.ts [--run] [--base-only] [--report] [--runs N] [--model M] [--alt-threshold T] [--sizes A,B] [--max-total-usd U] [--dir D]
With no --run it is a dry run: it prints the plan and the expected cost, and makes no call.
--base-only stops after the base sessions and runs no fork, which exercises the paid path and measures the base context for the price of one base.
--report reads the forks that --dir already holds in ${RESULTS_FILE} and reports them, free and with no call, which is how a round stopped by its cost cap is still reported.
--run makes the paid calls. N is a whole number of at least ${SMOKE_MIN_RUNS} (default ${DEFAULT_RUNS}, the citable floor of ${CITABLE_MIN_RUNS} and a spare, so a fork lost to a transient failure does not cost the round its citability), M is one of ${MODELS.join(", ")} (default ${DEFAULT_MODEL}), T is the candidate threshold in tokens (default ${DEFAULT_ALT_THRESHOLD}, and the reference arm is ${HANDOFF_TRIGGER_TOKENS}), A,B are base sizes in tokens (default ${DEFAULT_SIZES.join(",")}), and U is a cost above 0 that stops the round (default ${ROUND_BUDGET_USD}).`;

const thresholdOf = (text: string): number | null => {
	const n = wholeAbove(text, 1);
	return n !== null &&
		n !== HANDOFF_TRIGGER_TOKENS &&
		n <= compactAt(CONTEXT_WINDOW)
		? n
		: null;
};

const sizesOf = (text: string): number[] | null => {
	const sizes = text.split(",").map((s) => wholeAbove(s, 1));
	return sizes.every((s) => s !== null) ? sizes : null;
};

const capOf = (text: string): number | null => {
	const n = Number(text);
	return Number.isFinite(n) && n > 0 ? n : null;
};

const modelOf = (text: string): string | null =>
	MODELS.find((m) => m === text) ?? null;

/**
 * The config of `args`, or `null` when any value is wrong, or `--run` is given with `--dry-run`, or
 * `--run` is given with `--report`, which would pay for forks and then report the saved ones instead.
 */
export const parse = (args: string[]): Config | null => {
	const paid = args.includes("--run");
	const report = args.includes("--report");
	if (paid && (args.includes("--dry-run") || report)) {
		return null;
	}
	const runs = flagged(args, "--runs", DEFAULT_RUNS, (t) =>
		wholeAbove(t, SMOKE_MIN_RUNS),
	);
	const model = flagged(args, "--model", DEFAULT_MODEL, modelOf);
	const alt = flagged(
		args,
		"--alt-threshold",
		DEFAULT_ALT_THRESHOLD,
		thresholdOf,
	);
	const sizes = flagged(args, "--sizes", DEFAULT_SIZES, sizesOf);
	const cap = flagged(args, "--max-total-usd", ROUND_BUDGET_USD, capOf);
	const dir = flagged(
		args,
		"--dir",
		path.join(os.tmpdir(), "claudetto-probe-threshold"),
		(t) => t,
	);
	if (
		runs === null ||
		model === null ||
		alt === null ||
		sizes === null ||
		cap === null ||
		dir === null
	) {
		return null;
	}
	return {
		paid,
		baseOnly: args.includes("--base-only"),
		report,
		runs,
		model,
		alt,
		sizes,
		cap,
		dir,
	};
};
