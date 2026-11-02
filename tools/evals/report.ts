// An `error` is counted apart and left out of the rate: a run that was not graded says nothing.

import { total } from "../../claudekit/total.ts";
import { EVAL_MIN_RUNS_PER_ARM } from "../limits.ts";
import type { Outcome } from "./execute.ts";

export interface Row {
	readonly key: string;
	readonly arm: string;
	readonly pass: number;
	readonly fail: number;
	readonly error: number;
}

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

export const rateOf = (row: Row): string => {
	const graded = row.pass + row.fail;
	return graded === 0 ? "n/a" : `${Math.round((100 * row.pass) / graded)}%`;
};

export const isCitable = (row: Row): boolean =>
	row.pass + row.fail >= EVAL_MIN_RUNS_PER_ARM;

const sessions = (n: number): string =>
	n === 1 ? "1 session" : `${n} sessions`;

/** The tokens and dollars of the sessions that reported them, so a paid run states its cost. */
export const spendLine = (outcomes: readonly Outcome[]): string => {
	const spent = outcomes.flatMap((o) =>
		o.spend === undefined ? [] : [o.spend],
	);
	const tokens = total(spent.map((s) => s.tokens));
	const usd = total(spent.map((s) => s.costUsd));
	const none = outcomes.length - spent.length;
	return `Spend: ${tokens.toLocaleString("en-US")} tokens and $${usd.toFixed(2)} over ${sessions(spent.length)}; ${sessions(none)} reported none.`;
};

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
		spendLine(outcomes),
		`${outcomes.length} sessions: ${count("pass")} pass, ${count("fail")} fail, ${count("error")} error.`,
	);
	return lines;
};
