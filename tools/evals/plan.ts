// No I/O, so a plan can be printed before anything is approved.

import { EVAL_MIN_RUNS_PER_ARM } from "../limits.ts";
import { RULE_CASE_ARMS, type RuleCase } from "./main-rules.ts";

export type Arm = (typeof RULE_CASE_ARMS)[number];

export interface Session {
	readonly key: string;
	readonly arm: Arm;
	readonly run: number;
}

export interface Request {
	/** Below `EVAL_MIN_RUNS_PER_ARM` the result cannot be cited. */
	readonly runs?: number;
	readonly only?: string;
	readonly arm?: Arm;
}

export interface Plan {
	readonly sessions: readonly Session[];
	readonly unseeded: readonly string[];
	readonly runs: number;
}

export const caseKey = (row: RuleCase): string => row.codes.join("_");

export const isArm = (value: string): value is Arm =>
	RULE_CASE_ARMS.some((arm) => arm === value);

const sessionsOf = (
	key: string,
	runs: number,
	only: Arm | undefined,
): readonly Session[] =>
	RULE_CASE_ARMS.filter((arm) => only === undefined || only === arm).flatMap(
		(arm) =>
			Array.from({ length: runs }, (_, at) => ({ key, arm, run: at + 1 })),
	);

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

/** A reply grader makes no model call, so it adds none. */
export const modelCalls = (plan: Plan): number => plan.sessions.length;
