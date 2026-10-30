import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Result } from "../result.ts";
import {
	baseProblem,
	overBudget,
	overWeekly,
	type Runners,
	runAll,
} from "../round.ts";

describe("baseProblem", () => {
	test("a base under both thresholds and over its target is fine", () => {
		expect(baseProblem(45_000, 30_000, 100_000)).toBeNull();
	});

	test("a base below its target means a compaction shrank it", () => {
		expect(baseProblem(20_000, 30_000, 100_000)).not.toBeNull();
	});

	test("a base at the lowest threshold would make both arms compact at once", () => {
		expect(baseProblem(100_000, 30_000, 100_000)).not.toBeNull();
	});
});

describe("overBudget", () => {
	test("is clear at the cap and a cause over it", () => {
		expect(overBudget(45, 45)).toBeNull();
		expect(overBudget(45.01, 45)).not.toBeNull();
	});
});

describe("overWeekly", () => {
	test("refuses a run priced at 10% when 95% is used, and names both figures", () => {
		const why = overWeekly(10, 95);

		expect(why).toContain("10.0%");
		expect(why).toContain("95.0%");
		expect(why).toContain("5.0%");
	});

	test("passes the same run when 10% is used", () => {
		expect(overWeekly(10, 10)).toBeNull();
	});

	test("falls back to the dollar cap when the login reports no reading", () => {
		expect(overWeekly(10, undefined)).toBeNull();
		expect(overWeekly(10, null)).toBeNull();
	});

	test("passes a run that takes exactly what is left", () => {
		expect(overWeekly(10, 90)).toBeNull();
	});
});

describe("runAll weekly guard", () => {
	const never = {
		base: () => Promise.reject(new Error("a call was made")),
		fork: () => Promise.reject(new Error("a call was made")),
	};
	const options = {
		runs: 10,
		model: "claude-sonnet-5-5",
		alt: 100_000,
		sizes: [90_000],
		cap: 26,
		lowest: 100_000,
	};

	test("refuses before any call when the round does not fit in what is left", async () => {
		const root = await mkdtemp(path.join(tmpdir(), "round-"));

		const run = runAll(root, never, { ...options, weeklyUsed: 99.5 });

		await expect(run).rejects.toThrow("weekly limit");
	});

	test("goes on to the first call when the login reports no reading", async () => {
		const root = await mkdtemp(path.join(tmpdir(), "round-"));

		const run = runAll(root, never, { ...options, weeklyUsed: null });

		await expect(run).rejects.toThrow("a call was made");
	});
});

describe("runAll retry", () => {
	const result = (over: Partial<Result> = {}): Result => ({
		arm: "ref",
		size: 90_000,
		run: 1,
		cost: 0.1,
		turns: 10,
		compactions: 1,
		peak: 95_000,
		firstPre: 94_000,
		firstPost: 40_000,
		broken: 0,
		untested: 0,
		skipped: 0,
		rereads: 0,
		redone: 0,
		next: 1,
		firstWrite: 1000,
		shares: [0.9, 0.9],
		invalid: null,
		...over,
	});

	/** Runners whose first fork fails with `why` and whose later forks are all valid. */
	const flaky = (why: string): Runners => {
		let calls = 0;
		return {
			base: () =>
				Promise.resolve({
					id: "base-1",
					context: 95_000,
					base: {
						cost: 0.4,
						read: new Set<string>(),
						edited: new Set<string>(),
					},
				}),
			fork: (f) => {
				calls += 1;
				return Promise.resolve(
					result({
						arm: f.arm,
						run: f.run,
						invalid: calls === 1 ? why : null,
					}),
				);
			},
		};
	};
	const options = {
		runs: 3,
		model: "claude-sonnet-5-5",
		alt: 100_000,
		sizes: [90_000],
		cap: 26,
		lowest: 100_000,
		weeklyUsed: 10,
	};

	test("a fork lost to a transient failure is run once more", async () => {
		const root = await mkdtemp(path.join(tmpdir(), "round-"));

		const { results } = await runAll(
			root,
			flaky("step 1: no result event"),
			options,
		);

		// Six planned forks and one retry. The failed fork is kept, because the round paid for it.
		expect(results).toHaveLength(7);
		expect(results.filter((r) => r.invalid !== null)).toHaveLength(1);
	});

	test("a fork that used its turn budget is not run again", async () => {
		const root = await mkdtemp(path.join(tmpdir(), "round-"));

		const { results } = await runAll(
			root,
			flaky("step 1: is_error (error_max_turns)"),
			options,
		);

		expect(results).toHaveLength(6);
		expect(results.filter((r) => r.invalid !== null)).toHaveLength(1);
	});

	test("the retry is saved to the results file with the fork it replaces", async () => {
		const root = await mkdtemp(path.join(tmpdir(), "round-"));

		await runAll(root, flaky("step 1: exit 1"), options);

		const lines = (await readFile(path.join(root, "results.jsonl"), "utf8"))
			.trim()
			.split("\n");
		expect(lines).toHaveLength(7);
	});
});
