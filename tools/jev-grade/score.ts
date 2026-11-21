import { type JevConfig, NO_AT, YES_AT } from "./config";

/** How one Noul probability reads. */
export type Verdict = "yes" | "no" | "unsettled";

/**
 * Reads a Noul probability against the thresholds.
 *
 * @param noul A probability from 0 to 1.
 * @returns yes at 0.7 or more, no at 0.3 or less, else unsettled.
 */
export function classify(noul: number): Verdict {
	if (noul >= YES_AT) {
		return "yes";
	}
	return noul <= NO_AT ? "no" : "unsettled";
}

/**
 * Weighted mean of the Noul probabilities: the expected share of outcome checks met.
 *
 * @param config The case's questions and weights.
 * @param noul The probability per question id.
 * @returns The run score from 0 to 1.
 */
export function runScore(
	config: JevConfig,
	noul: Readonly<Record<string, number>>
): number {
	let sum = 0;
	let weights = 0;
	for (const [id, question] of Object.entries(config.questions)) {
		sum += question.weight * (noul[id] ?? 0);
		weights += question.weight;
	}
	return sum / weights;
}

/**
 * Arithmetic mean.
 *
 * @param values The numbers.
 * @returns The mean, or `undefined` for no values.
 */
export function mean(values: readonly number[]): number | undefined {
	return values.length === 0
		? undefined
		: values.reduce((a, b) => a + b, 0) / values.length;
}

/** One question's tally over an arm's scored runs. */
export interface QuestionTally {
	readonly mean: number;
	readonly yes: number;
	readonly no: number;
	readonly unsettled: number;
}

/**
 * Tallies one question over an arm's runs.
 *
 * @param probabilities This question's Noul from each scored run.
 * @returns The mean and the yes, no and unsettled counts, or `undefined` for no runs.
 */
export function tally(
	probabilities: readonly number[]
): QuestionTally | undefined {
	const average = mean(probabilities);
	if (average === undefined) {
		return undefined;
	}
	const verdicts = probabilities.map((value) => classify(value));
	const count = (v: Verdict): number => verdicts.filter((x) => x === v).length;
	return {
		mean: average,
		yes: count("yes"),
		no: count("no"),
		unsettled: count("unsettled")
	};
}
