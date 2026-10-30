// The table and the counts of a set of outcomes. An `error` is counted apart and left out of the
// rate, because a run that could not be graded says nothing about the arm.

import { EVAL_MIN_RUNS_PER_ARM } from "../limits.ts";
import type { Outcome } from "./execute.ts";

/** The counts of passes, fails, and errors for one case under one arm. */
export interface Row {
	readonly key: string;
	readonly arm: string;
	readonly pass: number;
	readonly fail: number;
	readonly error: number;
}

/** The counts per case and arm, in the order each pair first appears. */
export const tally = (outcomes: readonly Outcome[]): readonly Row[] => {
	const rows = new Map<string, Row>();
	for (const { session, score } of outcomes) {
		const id = `${session.key}\u0000${session.arm}`;
		const row = rows.get(id) ?? {
			key: session.key,
			arm: session.arm,
			pass: 0,
			fail: 0,
			error: 0,
		};
		rows.set(id, { ...row, [score.verdict]: row[score.verdict] + 1 });
	}
	return [...rows.values()];
};

/** Passes over graded runs as a percentage, or `n/a` when no run was graded. */
export const rateOf = (row: Row): string => {
	const graded = row.pass + row.fail;
	return graded === 0 ? "n/a" : `${Math.round((100 * row.pass) / graded)}%`;
};

/** Whether the row has the runs that a citable arm needs, errors not counted. */
export const isCitable = (row: Row): boolean =>
	row.pass + row.fail >= EVAL_MIN_RUNS_PER_ARM;

/** The report as lines: a table, then a total, then the arms too thin to cite. */
export const reportLines = (
	outcomes: readonly Outcome[],
): readonly string[] => {
	const rows = tally(outcomes);
	const lines = [
		"| case | arm | pass | fail | error | rate | citable |",
		"| --- | --- | --- | --- | --- | --- | --- |",
		...rows.map(
			(row) =>
				`| ${row.key} | ${row.arm} | ${row.pass} | ${row.fail} | ${row.error} | ${rateOf(row)} | ${isCitable(row) ? "yes" : "no"} |`,
		),
	];
	const count = (verdict: "pass" | "fail" | "error"): number =>
		outcomes.filter((outcome) => outcome.score.verdict === verdict).length;
	lines.push(
		"",
		`${outcomes.length} sessions: ${count("pass")} pass, ${count("fail")} fail, ${count("error")} error.`,
	);
	return lines;
};
