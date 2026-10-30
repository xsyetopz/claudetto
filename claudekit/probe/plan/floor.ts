import { EVAL_MIN_RUNS_PER_ARM } from "../../../tools/limits.ts";

export const SMOKE_MIN_RUNS = 3;

export const CITABLE_MIN_RUNS = EVAL_MIN_RUNS_PER_ARM;

export const SPARE_RUNS = 1;

export const DEFAULT_RUNS = CITABLE_MIN_RUNS + SPARE_RUNS;

export const floorOf = (runs: number): "citable" | "smoke" | "below" => {
	if (runs >= CITABLE_MIN_RUNS) {
		return "citable";
	}
	return runs >= SMOKE_MIN_RUNS ? "smoke" : "below";
};

export const ranLine = (runs: number): string =>
	floorOf(runs) === "citable"
		? `The round finished ${runs} valid runs in every arm, which meets the citable floor (${CITABLE_MIN_RUNS}), so a page of \`docs/\` may cite it.`
		: `The round finished ${runs} valid runs in its thinnest arm, below the citable floor (${CITABLE_MIN_RUNS}), so a page of \`docs/\` may not cite it as runs per arm.`;

export const floorLine = (runs: number): string => {
	if (floorOf(runs) !== "citable") {
		return `${runs} runs per arm meets the smoke floor (${SMOKE_MIN_RUNS}) only, not the citable floor (${CITABLE_MIN_RUNS}), so a page of \`docs/\` may not cite it as runs per arm.`;
	}
	const spare = runs - CITABLE_MIN_RUNS;
	const cover =
		spare === 0
			? "and it carries no spare, so one lost fork takes an arm below the floor and the round is paid for and uncitable"
			: `and it carries ${spare} spare ${spare === 1 ? "run" : "runs"} per arm, so up to that many forks of an arm can be lost and the round is still citable`;
	return `${runs} runs per arm meets the citable floor (${CITABLE_MIN_RUNS}), so a page of \`docs/\` may cite it, ${cover}.`;
};
