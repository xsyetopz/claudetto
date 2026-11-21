import { USD_PER_MTOK } from "./config";
import { type Arm, ARMS, type CaseOutcome, type Graded } from "./run";
import { mean, tally } from "./score";

const fmt = (value: number | undefined): string =>
	value === undefined ? "n/a" : value.toFixed(2);

const scored = (runs: CaseOutcome["runs"], arm: Arm) =>
	runs.filter((run) => run.arm === arm && run.error === undefined);

const armLine = (outcome: CaseOutcome, arm: Arm): string[] => {
	const runs = outcome.runs.filter((run) => run.arm === arm);
	const ok = scored(outcome.runs, arm);
	const lines = [`  ${arm} (${ok.length} of ${runs.length} runs scored)`];
	for (const id of Object.keys(outcome.config.questions)) {
		const result = tally(ok.map((run) => run.noul?.[id] ?? 0));
		lines.push(
			result === undefined
				? `    ${id}: n/a`
				: `    ${id}: ${fmt(result.mean)}  yes ${result.yes} / no ${result.no} / unsettled ${result.unsettled}`
		);
	}
	return lines;
};

const jevMean = (outcome: CaseOutcome, arm: Arm): number | undefined =>
	mean(
		scored(outcome.runs, arm).flatMap((run) =>
			run.jevScore === undefined ? [] : [run.jevScore]
		)
	);

const engineMean = (outcome: CaseOutcome, arm: Arm): number | undefined =>
	mean(
		outcome.runs.flatMap((run) =>
			run.arm === arm && run.engineScore !== undefined ? [run.engineScore] : []
		)
	);

const caseLines = (outcome: CaseOutcome): string[] => {
	const [withJev, withoutJev] = ARMS.map((arm) => jevMean(outcome, arm));
	const delta =
		withJev === undefined || withoutJev === undefined
			? undefined
			: withJev - withoutJev;
	const sign = delta !== undefined && delta > 0 ? "+" : "";
	const lines = [
		outcome.name,
		`  engine score  with ${fmt(engineMean(outcome, "with"))}  without ${fmt(engineMean(outcome, "without"))}`,
		`  Jev score     with ${fmt(withJev)}  without ${fmt(withoutJev)}  delta ${delta === undefined ? "n/a" : sign + delta.toFixed(2)}`,
		...ARMS.flatMap((arm) => armLine(outcome, arm))
	];
	for (const run of outcome.runs) {
		if (run.error !== undefined) {
			lines.push(`  ERROR ${run.arm} run ${run.index + 1}: ${run.error}`);
		}
	}
	return lines;
};

/**
 * Counts the runs that errored.
 *
 * @param graded A grading pass.
 * @returns The number of runs with an error.
 */
export const errorCount = (graded: Graded): number =>
	graded.cases.reduce(
		(sum, one) =>
			sum + one.runs.filter((run) => run.error !== undefined).length,
		0
	);

/**
 * Formats the per-case table, the totals and the error count.
 *
 * @param graded A grading pass.
 * @returns The text to print.
 */
export function formatReport(graded: Graded): string {
	const tokens = graded.cases.reduce(
		(sum, one) => sum + one.runs.reduce((a, run) => a + run.inputTokens, 0),
		0
	);
	const lines = graded.cases.flatMap((outcome) => [...caseLines(outcome), ""]);
	if (graded.skipped.length > 0) {
		lines.push(`no jev.yaml: ${graded.skipped.join(", ")}`);
	}
	lines.push(
		`input tokens ${tokens}, cost $${((tokens / 1_000_000) * USD_PER_MTOK).toFixed(6)} at $${USD_PER_MTOK}/Mtok`,
		`requests and responses: ${graded.stampDir}/jev/`
	);
	const errors = errorCount(graded);
	if (errors > 0) {
		lines.push(`${errors} run(s) errored and are not scored`);
	}
	return lines.join("\n");
}
