// Plan mode prints the sessions and their price and starts nothing. `--run` starts them, which is paid unless
// `--upstream` points the classifier requests at a local fake.

import { resolve } from "node:path";
import { cwd } from "node:process";
import { UPSTREAM } from "../../../claudekit/api/forward.ts";
import { costOf } from "../../../claudekit/price/cost.ts";
import { shareText, weeklyShare } from "../../../claudekit/price/share.ts";
import type { CommandRunner } from "../../../claudekit/session/command.ts";
import { EVAL_MIN_RUNS_PER_ARM } from "../../limits.ts";
import { PLUGIN_DIR } from "../session.ts";
import {
	CLASSIFIER_ARMS,
	type ClassifierArm,
	isClassifierArm,
} from "./arms.ts";
import { CLASSIFIER_CASES, type ClassifierCase } from "./cases.ts";
import { sessionUsd } from "./price.ts";
import {
	type ClassifierOutcome,
	type ClassifierSession,
	runClassifierSession,
} from "./session.ts";

export const CLASSIFIER_USAGE =
	"usage: just eval --classifier [--run] [--case KEY] [--arm ARM] [--runs N] [--upstream URL]";

export const POSITIVE_INTEGER = /^[1-9][0-9]*$/;

interface Options {
	readonly run: boolean;
	readonly only?: string;
	readonly arm?: ClassifierArm;
	readonly runs: number;
	readonly upstream: string;
}

/** Sets the option a flag names from its value, or gives `undefined` when the value is not one the flag takes. */
export type Patch<O> = (options: O, value: string) => O | undefined;

const VALUE_FLAGS: ReadonlyMap<string, Patch<Options>> = new Map<
	string,
	Patch<Options>
>([
	["--case", (o, v) => ({ ...o, only: v })],
	["--arm", (o, v) => (isClassifierArm(v) ? { ...o, arm: v } : undefined)],
	[
		"--runs",
		(o, v) =>
			POSITIVE_INTEGER.test(v) ? { ...o, runs: Number(v) } : undefined,
	],
	["--upstream", (o, v) => ({ ...o, upstream: v })],
]);

/** Reads `--run` and the flags of `flags`, each of which takes the value after it. */
export const parseFlags = <O extends { readonly run: boolean }>(
	args: readonly string[],
	options: O,
	flags: ReadonlyMap<string, Patch<O>>,
): O | { readonly error: string } => {
	const [flag, ...rest] = args;
	switch (flag) {
		case undefined:
			return options;
		case "--run":
			return parseFlags(rest, { ...options, run: true }, flags);
	}
	const patch = flags.get(flag);
	const [value, ...after] = rest;
	if (patch === undefined || value === undefined) {
		return { error: `${flag} is not a flag, or it has no value` };
	}
	const next = patch(options, value);
	return next === undefined
		? { error: `${value} is not a value of ${flag}` }
		: parseFlags(after, next, flags);
};

export const parseClassifierArgs = (
	args: readonly string[],
	options: Options = {
		run: false,
		runs: EVAL_MIN_RUNS_PER_ARM,
		upstream: UPSTREAM,
	},
): Options | { readonly error: string } =>
	parseFlags(args, options, VALUE_FLAGS);

interface Planned {
	readonly row: ClassifierCase;
	readonly session: ClassifierSession;
}

export const planClassifier = (options: Options): readonly Planned[] =>
	CLASSIFIER_CASES.filter(
		(row) => options.only === undefined || row.key === options.only,
	).flatMap((row) =>
		CLASSIFIER_ARMS.filter(
			(arm) => options.arm === undefined || arm === options.arm,
		).flatMap((arm) =>
			Array.from({ length: options.runs }, (_, at) => ({
				row,
				session: { key: row.key, arm, run: at + 1 },
			})),
		),
	);

export const priceLines = (planned: readonly Planned[]): readonly string[] => {
	const arms = CLASSIFIER_ARMS.map((arm) => {
		const sessions = planned.filter((one) => one.session.arm === arm).length;
		return { arm, sessions, usd: sessions * sessionUsd(arm) };
	}).filter((one) => one.sessions > 0);
	let total = 0;
	for (const one of arms) {
		total += one.usd;
	}
	return [
		...arms.map(
			(one) =>
				`arm ${one.arm}: ${one.sessions} sessions, at most $${one.usd.toFixed(2)}`,
		),
		`total: at most $${total.toFixed(2)}, ${shareText(weeklyShare(total))} of the weekly limit`,
	];
};

const spentUsd = (outcomes: readonly ClassifierOutcome[]): number => {
	let usd = 0;
	for (const row of outcomes.flatMap((one) => one.forwarded)) {
		usd += row.usage === undefined ? 0 : costOf(row.model, row.usage);
	}
	return usd;
};

/** The score of each arm and the dollars its forwarded replies report, so a paid run records its own bill. */
export const reportLines = (
	outcomes: readonly ClassifierOutcome[],
): string[] => [
	...CLASSIFIER_ARMS.flatMap((arm) => {
		const mine = outcomes.filter((one) => one.session.arm === arm);
		if (mine.length === 0) {
			return [];
		}
		const count = (verdict: string) =>
			mine.filter((one) => one.score.verdict === verdict).length;
		return [
			`arm ${arm}: ${count("pass")} pass, ${count("fail")} fail, ${count("error")} error, $${spentUsd(mine).toFixed(4)} measured`,
			...mine.map(
				(one) =>
					`  ${one.session.key} run ${one.session.run}: ${one.score.verdict}, ${one.score.detail}`,
			),
		];
	}),
	`total: $${spentUsd(outcomes).toFixed(4)} measured`,
];

/** Runs `planned` one at a time, so a paid run never overlaps itself. */
const runAll = async (
	deps: Parameters<typeof runClassifierSession>[0],
	planned: readonly Planned[],
	done: readonly ClassifierOutcome[] = [],
): Promise<readonly ClassifierOutcome[]> => {
	const [next, ...rest] = planned;
	if (next === undefined) {
		return done;
	}
	const outcome = await runClassifierSession(deps, next.row, next.session);
	return runAll(deps, rest, [...done, outcome]);
};

export const classifierMain = async (
	args: readonly string[],
	io: {
		readonly run: CommandRunner;
		readonly out: (line: string) => void;
		readonly root?: string;
	},
): Promise<number> => {
	const options = parseClassifierArgs(args);
	if ("error" in options) {
		io.out(options.error);
		io.out(CLASSIFIER_USAGE);
		return 2;
	}
	const planned = planClassifier(options);
	if (!options.run) {
		for (const line of [
			...priceLines(planned),
			`${options.runs} runs per arm`,
			"Plan only. Nothing ran. Add --run to start these sessions, which are paid.",
		]) {
			io.out(line);
		}
		return 0;
	}
	const outcomes = await runAll(
		{
			run: io.run,
			pluginDir: resolve(io.root ?? cwd(), PLUGIN_DIR),
			upstream: options.upstream,
		},
		planned,
	);
	for (const line of reportLines(outcomes)) {
		io.out(line);
	}
	return outcomes.some((one) => one.score.verdict === "error") ? 1 : 0;
};
