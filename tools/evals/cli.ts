#!/usr/bin/env bun
// Plan mode is the default and costs nothing; a session starts only under `--run`, a paid call.

import { dirname, join, resolve } from "node:path";
import { argv, cwd } from "node:process";
import { fileURLToPath } from "node:url";
import {
	type CommandRunner,
	spawnCommand,
} from "../../claudekit/session/command.ts";
import { classifierMain } from "./classifier/main.ts";
import { type Deps, executeSession, type Outcome } from "./execute.ts";
import { seededKeys } from "./fixture.ts";
import { RULE_CASES, type RuleCase } from "./main-rules.ts";
import {
	isArm,
	modelCalls,
	type Plan,
	planSessions,
	type Request,
} from "./plan.ts";
import { reportLines } from "./report.ts";
import { PLUGIN_DIR } from "./session.ts";

export const USAGE =
	"usage: bun tools/evals/cli.ts [--run] [--case KEY] [--arm ARM] [--runs N] [--model NAME] [--budget USD]";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

const POSITIVE_INTEGER = /^[1-9][0-9]*$/;

interface Options {
	readonly run: boolean;
	readonly request: Request;
	readonly model?: string;
	readonly maxBudgetUsd?: number;
}

type Patch = (options: Options, value: string) => Options | undefined;

const VALUE_FLAGS: ReadonlyMap<string, Patch> = new Map<string, Patch>([
	["--case", (o, v) => ({ ...o, request: { ...o.request, only: v } })],
	[
		"--arm",
		(o, v) =>
			isArm(v) ? { ...o, request: { ...o.request, arm: v } } : undefined,
	],
	[
		"--runs",
		(o, v) =>
			POSITIVE_INTEGER.test(v)
				? { ...o, request: { ...o.request, runs: Number(v) } }
				: undefined,
	],
	["--model", (o, v) => ({ ...o, model: v })],
	[
		"--budget",
		(o, v) => (Number(v) > 0 ? { ...o, maxBudgetUsd: Number(v) } : undefined),
	],
]);

export const parseArgs = (
	args: readonly string[],
	options: Options = { run: false, request: {} },
): Options | { readonly error: string } => {
	const [flag, ...rest] = args;
	switch (flag) {
		case undefined:
			return options;
		case "--run":
			return parseArgs(rest, { ...options, run: true });
		default: {
			const patch = VALUE_FLAGS.get(flag);
			const [value, ...after] = rest;
			if (patch === undefined || value === undefined) {
				return { error: `${flag} is not a flag, or it has no value` };
			}
			const next = patch(options, value);
			return next === undefined
				? { error: `${value} is not a value of ${flag}` }
				: parseArgs(after, next);
		}
	}
};

export const planLines = (plan: Plan): readonly string[] => [
	...plan.sessions.map(
		(session) => `session ${session.key} | ${session.arm} | run ${session.run}`,
	),
	...plan.unseeded.map((key) => `unseeded ${key}: no fixture, so no session`),
	`${plan.runs} runs per arm`,
	`model calls: ${modelCalls(plan)}`,
	"Plan only. Nothing ran. Add --run to start these sessions, which are paid.",
];

/** Runs `sessions` one at a time, so a paid run never overlaps itself. */
const runAll = async (
	deps: Deps,
	sessions: Plan["sessions"],
	done: readonly Outcome[] = [],
): Promise<readonly Outcome[]> => {
	const [next, ...rest] = sessions;
	if (next === undefined) {
		return done;
	}
	const outcome = await executeSession(deps, next);
	return runAll(deps, rest, [...done, outcome]);
};

export const main = async (
	args: readonly string[],
	io: {
		readonly run: CommandRunner;
		readonly out: (line: string) => void;
		readonly cases?: readonly RuleCase[];
		readonly fixturesRoot?: string;
		readonly root?: string;
	},
): Promise<number> => {
	if (args[0] === "--classifier") {
		return classifierMain(args.slice(1), io);
	}
	const options = parseArgs(args);
	if ("error" in options) {
		io.out(options.error);
		io.out(USAGE);
		return 2;
	}
	const fixturesRoot = io.fixturesRoot ?? FIXTURES;
	const plan = planSessions(
		io.cases ?? RULE_CASES,
		await seededKeys(fixturesRoot),
		options.request,
	);
	if (!options.run) {
		for (const line of planLines(plan)) {
			io.out(line);
		}
		return 0;
	}
	const deps: Deps = {
		run: io.run,
		fixturesRoot,
		pluginDir: resolve(io.root ?? cwd(), PLUGIN_DIR),
		...(options.model === undefined ? {} : { model: options.model }),
		...(options.maxBudgetUsd === undefined
			? {}
			: { maxBudgetUsd: options.maxBudgetUsd }),
	};
	const outcomes = await runAll(deps, plan.sessions);
	for (const line of reportLines(outcomes)) {
		io.out(line);
	}
	return outcomes.some((outcome) => outcome.score.verdict === "error") ? 1 : 0;
};

if (import.meta.main) {
	process.exitCode = await main(argv.slice(2), {
		run: spawnCommand,
		out: (line) => console.info(line),
	});
}
