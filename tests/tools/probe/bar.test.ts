// The bar of the code-compaction probe: C wins only when it meets each bar at each size, and the plan holds 18 forks.

import { expect, test } from "bun:test";
import {
	type Arm,
	type Result,
	report,
	verdict,
} from "../../../dev/probe/bar.ts";
import { plan, runsOf } from "../../../dev/probe/main.ts";

const run = (arm: Arm, over: Partial<Result> = {}): Result => ({
	arm,
	size: 80_000,
	cost: arm === "C" ? 0.5 : 1,
	broken: 0,
	rereads: 1,
	redone: 0,
	next: 1,
	untested: 0,
	firstWrite: 1000,
	shares: [0.9, 0.95],
	compactCost: 0.1,
	compactMs: 1000,
	context: 9000,
	invalid: null,
	...over,
});
const SIZE = [80_000];
/** 3 runs of B and 3 runs of C at `size`, with `c` as the measures of C. */
const runs = (c: Partial<Result>, size = 80_000): Result[] => [
	...[1, 2, 3].map(() => run("B", { size })),
	...[1, 2, 3].map(() => run("C", { size, ...c })),
];
const win = (rs: Result[]) => verdict(rs, SIZE);

test("Code Arm Meets Each Bar: C matches B on quality, costs less, and has no cache problem", () => {
	expect(win(runs({}))).toEqual({ winner: "C", reasons: [] });
});

test("Code Arm Cheaper but Worse: C breaks a constraint, so no winner", () => {
	const v = win(runs({ broken: 1 }));
	expect(v.winner).toBeNull();
	expect(v.reasons).toEqual(["80k: C breaks more constraints"]);
	expect(report(v)).toStartWith("No winner.");
});

test("Larger Cache Write: C writes more on the first request, so no winner", () => {
	const v = win(runs({ firstWrite: 2000 }));
	expect(v.winner).toBeNull();
	expect(v.reasons[0]).toContain("cache problem");
});

test("Lower Read Share: a follow-up of C reads a lower share than B, so no winner", () => {
	const v = win(runs({ shares: [0.9, 0.5] }));
	expect(v.reasons).toEqual([
		"80k: cache problem, C reads a lower share in follow-up 2",
	]);
});

test("Each Size Counts: a miss at 200k stops the win, and a cost that is not lower misses", () => {
	const v = verdict([...runs({}), ...runs({ cost: 1 }, 200_000)]);
	expect(v.reasons).toEqual(["200k: C costs no less"]);
});

test("NaN Cache: a C write or share that is NaN is a cache problem, not a pass", () => {
	expect(win(runs({ firstWrite: Number.NaN })).reasons[0]).toContain(
		"cache problem",
	);
	expect(win(runs({ shares: [] })).winner).toBeNull();
	expect(win(runs({ shares: [Number.NaN, 0.95] })).reasons).toEqual([
		"80k: cache problem, C reads a lower share in follow-up 1",
	]);
});

test("No Winner Without Data: no results, a missing size, or fewer than 3 valid runs of B or C", () => {
	expect(win([]).winner).toBeNull();
	expect(verdict(runs({}), [80_000, 200_000]).reasons).toEqual([
		"200k: B has 0 valid runs, needs 3",
		"200k: C has 0 valid runs, needs 3",
	]);
	expect(win(runs({}).slice(1)).reasons).toEqual([
		"80k: B has 2 valid runs, needs 3",
	]);
});

test("Invalid Fork: it is out of the means, and any invalid fork stops the win", () => {
	const rs = [...runs({}), run("H", { invalid: "exit 1", cost: Number.NaN })];
	expect(win(rs)).toEqual({
		winner: null,
		reasons: ["invalid fork H 80k: exit 1"],
	});
	const c = runs({}).map((r, i) =>
		i === 3 ? { ...r, invalid: "no result" } : r,
	);
	expect(win(c).reasons).toEqual([
		"invalid fork C 80k: no result",
		"80k: C has 2 valid runs, needs 3",
	]);
});

test("Not Tested: a fork that left a constraint untested is no pass", () => {
	const v = win(runs({ untested: 1 }));
	expect(v.winner).toBeNull();
	expect(v.reasons).toEqual(["80k: C left 3 constraint checks untested"]);
});

test("Plan: 3 arms, 2 sizes, and 3 runs make 18 forks, and H has 1 follow-up less, because its resume turn does task 1.4", () => {
	const forks = plan();
	expect(forks).toHaveLength(18);
	expect(
		forks.every((f) => f.commands.length === (f.arm === "H" ? 2 : 3)),
	).toBe(true);
	expect(
		forks
			.find((f) => f.arm === "H")
			?.commands.some((c) => c.join(" ").includes("task 1.4")),
	).toBe(false);
});

test("Plan: `--runs 5` makes 30 forks, numbered 1 to 5 for each arm and size", () => {
	const forks = plan(runsOf(["--run", "--runs", "5"]) ?? 0);
	expect(forks).toHaveLength(30);
	expect(
		forks.filter((f) => f.arm === "C" && f.size === 80_000).map((f) => f.run),
	).toEqual([1, 2, 3, 4, 5]);
});

test("Plan: `--runs` defaults to 3, and a count below 3 or not a whole number is refused", () => {
	expect(runsOf(["--run"])).toBe(3);
	expect(runsOf(["--run", "--runs", "2"])).toBeNull();
	expect(runsOf(["--run", "--runs", "4.5"])).toBeNull();
	expect(runsOf(["--run", "--runs"])).toBeNull();
});
