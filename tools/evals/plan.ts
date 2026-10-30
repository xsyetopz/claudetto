// The sessions a request implies, with no I/O: a plan costs nothing, so it can be printed before
// anything is approved.

import { EVAL_MIN_RUNS_PER_ARM } from "../limits.ts";
import { RULE_CASE_ARMS, type RuleCase } from "./main-rules.ts";

/** One of the two prompts a case runs under, `main.md` or the default body. */
export type Arm = (typeof RULE_CASE_ARMS)[number];

/** One run of one case under one arm. */
export interface Session {
	/** The folder name of the case's fixture, from `caseKey`. */
	readonly key: string;
	readonly arm: Arm;
	/** From 1. */
	readonly run: number;
}

/** Which sessions a plan covers: the runs per arm, and an optional restriction to one case or one arm. */
export interface Request {
	/** Runs per arm. Below `EVAL_MIN_RUNS_PER_ARM` the result cannot be cited. */
	readonly runs?: number;
	/** Only the case with this key. */
	readonly only?: string;
	/** Only this arm. */
	readonly arm?: Arm;
}

/** The sessions to run, the keys of cases skipped for lacking a fixture, and the runs per arm used. */
export interface Plan {
	/** The sessions of the cases that have a fixture, in case, arm, run order. */
	readonly sessions: readonly Session[];
	/** The keys of the selected cases that have no fixture, which no session can seed. */
	readonly unseeded: readonly string[];
	/** The runs per arm that the plan used. */
	readonly runs: number;
}

/** The fixture folder name of a case: its codes joined by `_`. */
export const caseKey = (row: RuleCase): string => row.codes.join("_");

/** Whether a command-line word is one of the two arms, `main.md` or `the default body`: `plugin` is not. */
export const isArm = (value: string): value is Arm =>
	RULE_CASE_ARMS.some((arm) => arm === value);

/** The sessions of one seeded case: each arm in turn (or only `only`), with its runs numbered from 1. */
const sessionsOf = (
	key: string,
	runs: number,
	only: Arm | undefined,
): readonly Session[] =>
	RULE_CASE_ARMS.filter((arm) => only === undefined || only === arm).flatMap(
		(arm) =>
			Array.from({ length: runs }, (_, at) => ({ key, arm, run: at + 1 })),
	);

/** The sessions of `request` over `cases`, where `seeded` holds the keys that have a fixture. */
export const planSessions = (
	cases: readonly RuleCase[],
	seeded: ReadonlySet<string>,
	request: Request = {},
): Plan => {
	const runs = request.runs ?? EVAL_MIN_RUNS_PER_ARM;
	const sessions: Session[] = [];
	const unseeded: string[] = [];
	for (const row of cases) {
		const key = caseKey(row);
		if (request.only !== undefined && request.only !== key) {
			continue;
		}
		if (!seeded.has(key)) {
			unseeded.push(key);
			continue;
		}
		sessions.push(...sessionsOf(key, runs, request.arm));
	}
	return { sessions, unseeded, runs };
};

/** The model calls of a plan: one `claude -p` session each. A reply grader is never run, so it adds none. */
export const modelCalls = (plan: Plan): number => plan.sessions.length;
