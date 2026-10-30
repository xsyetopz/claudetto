// The cost of each fork, listed per arm and size, with a first fork that paid a large cache write shown apart from the mean
// (the `compaction-path` spec, "Runs Repeat").

import type { Arm, Result } from "./result.ts";
import { mean, validAt, verdictSizes } from "./verdict.ts";

/** A first fork counts as slow when its first cache write is this many times the mean of the other forks. */
export const SLOW_FIRST_FACTOR = 2;

/** The cost of the forks of one arm at one size: each fork's cost in run order, the mean, and the mean without a slow first fork. */
export interface CostRow {
	arm: Arm;
	size: number;
	/** The cost of each valid fork, in run order. */
	costs: number[];
	mean: number;
	/** Whether the first fork paid a first cache write far above the other forks. */
	slowFirst: boolean;
	/** The mean cost without the first fork, which is the mean again when the first fork is not slow. */
	meanRest: number;
	firstWrite: number;
}

const rowOf = (rs: Result[], arm: Arm, size: number): CostRow => {
	const forks = validAt(rs, arm, size);
	const costs = forks.map((f) => f.cost);
	const first = forks[0]?.firstWrite ?? Number.NaN;
	const restWrite = mean(forks.slice(1).map((f) => f.firstWrite));
	const slowFirst = first > restWrite * SLOW_FIRST_FACTOR;
	return {
		arm,
		size,
		costs,
		mean: mean(costs),
		slowFirst,
		meanRest: slowFirst ? mean(costs.slice(1)) : mean(costs),
		firstWrite: first,
	};
};

/** One row for each arm at each size of `rs`, `ref` before `alt`. */
export const costsOf = (rs: Result[]): CostRow[] =>
	verdictSizes(rs).flatMap((size) =>
		(["ref", "alt"] as const)
			.filter((arm) => rs.some((r) => r.arm === arm && r.size === size))
			.map((arm) => rowOf(rs, arm, size)),
	);

const money = (x: number): string => x.toFixed(2);

/** One line for each arm and size, `ref` before `alt`: the cost of each fork in dollars to 2 places and their mean, and a second line when the first fork paid a cache write that slows the mean. */
export const costLines = (rs: Result[]): string[] =>
	costsOf(rs).flatMap((row) => {
		const head = `${row.arm} ${row.size / 1000}k: ${row.costs.map(money).join(", ")}; mean ${money(row.mean)}`;
		return row.slowFirst
			? [
					head,
					`  fork 1 paid a first cache write of ${row.firstWrite} tokens, so the mean without it is ${money(row.meanRest)}`,
				]
			: [head];
	});
