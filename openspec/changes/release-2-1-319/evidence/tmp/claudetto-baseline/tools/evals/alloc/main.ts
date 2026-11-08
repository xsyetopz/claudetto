// Plan mode is the default and costs nothing: it prints each session with its arm's model and subagent model. `--run` starts the sessions, which are paid.

import { dirname, join, resolve } from "node:path";
import { cwd } from "node:process";
import { fileURLToPath } from "node:url";
import type { CommandRunner } from "../../../claudekit/session/command.ts";
import {
	makeFolders,
	removeFolders,
} from "../../../claudekit/session/folders.ts";
import { total } from "../../../claudekit/total.ts";
import { EVAL_MIN_RUNS_PER_ARM } from "../../limits.ts";
import {
	type Patch,
	POSITIVE_INTEGER,
	parseFlags,
} from "../classifier/main.ts";
import { executeSession, type Outcome } from "../execute.ts";
import { seededKeys } from "../fixture.ts";
import { RULE_CASES, type RuleCase } from "../main-rules.ts";
import { caseKey } from "../plan.ts";
import {
	ALLOCATION_ARMS,
	type AllocationArm,
	allocationOf,
	isAllocationArm,
	preparePlugins,
} from "./arms.ts";

export const ALLOCATION_USAGE =
	"usage: bun tools/evals/cli.ts --allocation [--run] [--case KEY] [--arm ARM] [--runs N]";

const FIXTURES = join(
	dirname(fileURLToPath(import.meta.url)),
	"..",
	"fixtures",
);

const TEMP_PREFIX = "/tmp/claudetto-alloc-";

interface Options {
	readonly run: boolean;
	readonly only?: string;
	readonly arm?: AllocationArm;
	readonly runs: number;
}

export interface AllocationSession {
	readonly key: string;
	readonly arm: AllocationArm;
	readonly run: number;
}

const VALUE_FLAGS: ReadonlyMap<string, Patch<Options>> = new Map([
	["--case", (o: Options, v: string) => ({ ...o, only: v })],
	[
		"--arm",
		(o: Options, v: string) =>
			isAllocationArm(v) ? { ...o, arm: v } : undefined,
	],
	[
		"--runs",
		(o: Options, v: string) =>
			POSITIVE_INTEGER.test(v) ? { ...o, runs: Number(v) } : undefined,
	],
]);

export const parseAllocationArgs = (
	args: readonly string[],
	options: Options = { run: false, runs: EVAL_MIN_RUNS_PER_ARM },
): Options | { readonly error: string } =>
	parseFlags(args, options, VALUE_FLAGS);

/** Every seeded case times every arm times the runs. */
export const planAllocation = (
	cases: readonly RuleCase[],
	seeded: ReadonlySet<string>,
	options: Options,
): readonly AllocationSession[] =>
	cases
		.map(caseKey)
		.filter(
			(key) =>
				seeded.has(key) && (options.only === undefined || options.only === key),
		)
		.flatMap((key) =>
			ALLOCATION_ARMS.filter(
				(arm) => options.arm === undefined || options.arm === arm,
			).flatMap((arm) =>
				Array.from({ length: options.runs }, (_, at) => ({
					key,
					arm,
					run: at + 1,
				})),
			),
		);

export const planLines = (
	sessions: readonly AllocationSession[],
): readonly string[] => [
	...sessions.map((one) => {
		const own = allocationOf(one.arm);
		return `session ${one.key} | ${one.arm} | run ${one.run} | model ${own.model} | subagents: ${own.subagents}`;
	}),
	...ALLOCATION_ARMS.filter((arm) =>
		sessions.some((one) => one.arm === arm),
	).map(
		(arm) =>
			`arm ${arm}: ${sessions.filter((one) => one.arm === arm).length} sessions, model ${allocationOf(arm).model}`,
	),
	`model calls: ${sessions.length}`,
];

export interface ArmOutcome {
	readonly arm: AllocationArm;
	readonly outcome: Outcome;
}

/** Pass rate and total price per accepted task, the two numbers task 3.4 scores by. */
export const reportLines = (
	outcomes: readonly ArmOutcome[],
): readonly string[] =>
	ALLOCATION_ARMS.flatMap((arm) => {
		const mine = outcomes.filter((one) => one.arm === arm);
		if (mine.length === 0) {
			return [];
		}
		const count = (verdict: string) =>
			mine.filter((one) => one.outcome.score.verdict === verdict).length;
		const pass = count("pass");
		const usd = total(mine.map((one) => one.outcome.spend?.costUsd ?? 0));
		const tokens = total(mine.map((one) => one.outcome.spend?.tokens ?? 0));
		const per = pass === 0 ? "n/a" : `$${(usd / pass).toFixed(2)}`;
		return [
			`${arm}: ${pass} pass, ${count("fail")} fail, ${count("error")} error | $${usd.toFixed(2)} total, ${per} per accepted task | ${tokens.toLocaleString("en-US")} tokens`,
		];
	});

export const allocationMain = async (
	args: readonly string[],
	io: {
		readonly run: CommandRunner;
		readonly out: (line: string) => void;
		readonly cases?: readonly RuleCase[];
		readonly fixturesRoot?: string;
		readonly root?: string;
		readonly tempPrefix?: string;
	},
): Promise<number> => {
	const options = parseAllocationArgs(args);
	if ("error" in options) {
		io.out(options.error);
		io.out(ALLOCATION_USAGE);
		return 2;
	}
	const fixturesRoot = io.fixturesRoot ?? FIXTURES;
	const sessions = planAllocation(
		io.cases ?? RULE_CASES,
		await seededKeys(fixturesRoot),
		options,
	);
	for (const line of planLines(sessions)) {
		io.out(line);
	}
	if (!options.run) {
		io.out(
			"Plan only. Nothing ran. Add --run to start these sessions, which are paid.",
		);
		return 0;
	}
	const folders = await makeFolders(io.tempPrefix ?? TEMP_PREFIX);
	try {
		const dirs = await preparePlugins(resolve(io.root ?? cwd()), folders.root);
		const outcomes: ArmOutcome[] = [];
		for (const one of sessions) {
			const own = allocationOf(one.arm);
			// `sessionArgv` loads the plugin for arm "root prompt" only, and every allocation arm loads it.
			const outcome = await executeSession(
				{
					run: io.run,
					fixturesRoot,
					pluginDir: dirs[one.arm],
					model: own.model,
					env: own.env,
					...(io.tempPrefix === undefined ? {} : { tempPrefix: io.tempPrefix }),
				},
				{ key: one.key, arm: "root prompt", run: one.run },
			);
			outcomes.push({ arm: one.arm, outcome });
		}
		for (const line of reportLines(outcomes)) {
			io.out(line);
		}
		return outcomes.some((one) => one.outcome.score.verdict === "error")
			? 1
			: 0;
	} finally {
		await removeFolders(folders.root);
	}
};
