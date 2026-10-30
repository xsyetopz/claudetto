import type { Arm, Result } from "./result.ts";
import { mean, validAt, verdictSizes } from "./verdict.ts";

export const SLOW_FIRST_FACTOR = 2;

export interface CostRow {
	arm: Arm;
	size: number;
	costs: number[];
	mean: number;
	slowFirst: boolean;
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

export const costsOf = (rs: Result[]): CostRow[] =>
	verdictSizes(rs).flatMap((size) =>
		(["ref", "alt"] as const)
			.filter((arm) => rs.some((r) => r.arm === arm && r.size === size))
			.map((arm) => rowOf(rs, arm, size)),
	);

const money = (x: number): string => x.toFixed(2);

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
