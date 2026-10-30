// The settings and the pure decisions of the run limits (`specs/run-limits/spec.md`). The hooks that
// use them are in `plugins/claudetto/tests/limits-*.test.ts`.

import { describe, expect, test } from "bun:test";
import { tasksText } from "../background.ts";
import { admitCall } from "../calls.ts";
import { failedText, withFailure } from "../failures.ts";
import { limitsOf } from "../settings.ts";
import { admitStart } from "../spawn.ts";

describe("limitsOf", () => {
	test("with no option each limit is the default of the source", () => {
		const limits = limitsOf({}, undefined);

		expect(limits).toEqual({
			subagentCap: undefined,
			startCap: 12,
			windowMs: 600_000,
			callCap: 20,
			heavyTokens: 400_000,
			failLimit: 3,
		});
	});

	test("the cap of the plan row is the starting cap of the subagents", () => {
		expect(limitsOf({}, 5).subagentCap).toBe(5);
	});

	test("an option replaces the default, a numeric string included", () => {
		const limits = limitsOf({ subagentCap: 2, callCap: "7" }, 5);

		expect(limits.subagentCap).toBe(2);
		expect(limits.callCap).toBe(7);
	});

	test("a value that is not a positive number gives the default", () => {
		const limits = limitsOf({ startCap: 0, failLimit: "many" }, undefined);

		expect(limits.startCap).toBe(12);
		expect(limits.failLimit).toBe(3);
	});
});

describe("the period", () => {
	const limits = limitsOf({ startCap: 2, callCap: 1, heavyTokens: 10 }, 9);

	test("a start is counted until the period holds the cap", () => {
		const first = admitStart([], 0, limits);
		const second = admitStart(first.next, 1, limits);

		const third = admitStart(second.next, 2, limits);

		expect(first.out).toBeUndefined();
		expect(third.out).toBeDefined();
		expect(third.next).toEqual([0, 1]);
	});

	test("a call below the heavy line empties the count", () => {
		const out = admitCall([0, 1], 2, 5, limits);

		expect(out).toEqual({ next: [], out: undefined });
	});

	test("a call whose context cannot be read empties the count", () => {
		expect(admitCall([0], 1, undefined, limits).next).toEqual([]);
	});
});

describe("failures", () => {
	const limits = limitsOf({ failLimit: 2 }, undefined);
	const call = { tool: "Bash", input: { command: "make" } };

	test("the same error adds up and a new error starts again", () => {
		const one = withFailure(undefined, { ...call, error: "a" }, 0, 1000);
		const two = withFailure(one, { ...call, error: "a" }, 1, 1000);
		const other = withFailure(two, { ...call, error: "b" }, 2, 1000);

		expect(failedText(two, call, 3, limits)).toContain("a");
		expect(failedText(other, call, 3, limits)).toBeUndefined();
	});

	test("a failure past the period is dropped from the record", () => {
		const old = withFailure(undefined, { ...call, error: "a" }, 0, 1000);

		const kept = withFailure(
			old,
			{ tool: "Read", input: {}, error: "b" },
			5000,
			1000,
		);

		expect(Object.keys(kept)).toHaveLength(1);
	});
});

describe("tasksText", () => {
	test("is absent for an empty list and for none", () => {
		expect(tasksText([])).toBeUndefined();
		expect(tasksText(undefined)).toBeUndefined();
	});
});
