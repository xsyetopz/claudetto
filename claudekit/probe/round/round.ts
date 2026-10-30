import { appendFile, mkdtemp, realpath } from "node:fs/promises";
import path from "node:path";
import { weeklyShare } from "../../price/share.ts";
import { eachInOrder, mapInOrder } from "../fixture/ordered.ts";
import { expectedUsd, FORK_USD } from "../plan/cost.ts";
import { type Fork, plan } from "../plan/plan.ts";
import type { Base } from "../transport/events.ts";
import { measure } from "./measure.ts";
import type { Result } from "./result.ts";
import { worthRetry } from "./retry.ts";
import { RESULTS_FILE } from "./saved.ts";

export interface Start {
	id: string;
	context: number;
	base: Base;
}

export interface Runners {
	base: (dir: string, size: number, model: string) => Promise<Start>;
	fork: (f: Fork, dir: string, start: Start) => Promise<Result>;
}

export interface Options {
	runs: number;
	model: string;
	alt: number;
	sizes: number[];
	cap: number;
	lowest: number;
	baseOnly?: boolean;
	weeklyUsed?: number | null | undefined;
}

export const baseProblem = (
	context: number,
	size: number,
	lowest: number,
): string | null => {
	if (context < size) {
		return `base ${size / 1000}k: context ${context} tokens is below the target ${size}, so a compaction likely ran while the base was built, and no fork runs`;
	}
	return context >= lowest
		? `base ${size / 1000}k: context ${context} tokens is at or over the lowest threshold ${lowest}, so both arms would compact at the first request, and no fork runs`
		: null;
};

export const overBudget = (spent: number, cap: number): string | null =>
	spent > cap
		? `round budget: ${spent.toFixed(2)} of ${cap.toFixed(2)} in total_cost_usd is spent, so the round stops before the next fork. Each fork that ran is in results.jsonl. Raise the cap with --max-total-usd when a round is meant to cost more.`
		: null;

export const overWeekly = (
	runPercent: number,
	usedPercent: number | null | undefined,
): string | null => {
	if (usedPercent === null || usedPercent === undefined) {
		return null;
	}
	const left = Math.max(0, 100 - usedPercent);
	return runPercent > left
		? `weekly limit: the round is priced at ${runPercent.toFixed(1)}% of the seven-day limit and ${usedPercent.toFixed(1)}% is used, which leaves ${left.toFixed(1)}%, so no call is made. Wait for the window to reset or shrink the round with --runs or --sizes.`
		: null;
};

const spentOn = (cost: number): number => (Number.isFinite(cost) ? cost : 0);

const empty: Base = { cost: 0, read: new Set(), edited: new Set() };

export interface Round {
	results: Result[];
	stopped: string | null;
}

/** Thrown when the cap stops a round, so the forks already run come back with the cause. */
class Capped extends Error {}

export const runAll = async (
	root: string,
	run: Runners,
	o: Options,
): Promise<Round> => {
	// The dearest end of the band, so a run that might not fit is not started on the hope that it does.
	const tooDear = overWeekly(
		weeklyShare(
			expectedUsd(
				o.baseOnly ? 0 : plan(o.runs, o.model, o.alt, o.sizes).length,
				o.sizes.length,
			),
		).high,
		o.weeklyUsed,
	);
	if (tooDear) {
		throw new Error(tooDear);
	}
	let spent = 0;
	const bases = await mapInOrder(o.sizes, async (size) => {
		const dir = await realpath(
			await mkdtemp(path.join(root, `${size / 1000}k-`)),
		);
		const start = await run.base(dir, size, o.model);
		const why = baseProblem(start.context, size, o.lowest);
		if (why) {
			throw new Error(why);
		}
		spent += spentOn(start.base.cost);
		return { size, dir, start };
	});
	const results: Result[] = [];
	if (o.baseOnly) {
		return { results, stopped: null };
	}
	const attempt = async (
		f: Fork,
		dir: string,
		start: Start,
	): Promise<Result> => {
		try {
			return await run.fork(f, dir, start);
		} catch (e) {
			return {
				...measure(
					f.arm,
					f.size,
					f.run,
					[],
					empty,
					{ broken: 0, untested: 0, skipped: 0 },
					"",
				),
				invalid: `threw: ${e instanceof Error ? e.message : e}`,
			};
		}
	};
	const keep = async (result: Result): Promise<void> => {
		results.push(result);
		// Each fork is saved when it ends, so a stop later in the round loses none.
		await appendFile(
			path.join(root, RESULTS_FILE),
			`${JSON.stringify(result)}\n`,
		);
		spent += spentOn(result.cost);
	};
	try {
		await eachInOrder(bases, ({ size, dir, start }) =>
			eachInOrder(plan(o.runs, o.model, o.alt, [size]), async (f) => {
				const first = await attempt(f, dir, start);
				await keep(first);
				if (
					first.invalid !== null &&
					worthRetry(first.invalid) &&
					!overBudget(spent + FORK_USD, o.cap)
				) {
					await keep(await attempt(f, dir, start));
				}
				const over = overBudget(spent, o.cap);
				if (over) {
					throw new Capped(over);
				}
			}),
		);
	} catch (e) {
		if (e instanceof Capped) {
			return { results, stopped: e.message };
		}
		throw e;
	}
	return { results, stopped: null };
};
