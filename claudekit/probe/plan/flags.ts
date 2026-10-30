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

export interface Config {
	paid: boolean;
	baseOnly: boolean;
	report: boolean;
	runs: number;
	model: string;
	alt: number;
	sizes: number[];
	cap: number;
	dir: string;
}

const rawValue = (args: string[], flag: string): string | undefined | null => {
	const at = args.indexOf(flag);
	if (at < 0) {
		return undefined;
	}
	return args[at + 1] ?? null;
};

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
