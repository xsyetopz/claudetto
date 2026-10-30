// Every expected count is arithmetic written out from the case list, not a figure copied from the tool.

import { describe, expect, test } from "bun:test";
import { EVAL_MIN_RUNS_PER_ARM } from "../../limits.ts";
import type { RuleCase } from "../main-rules.ts";
import { caseKey, isArm, modelCalls, planSessions } from "../plan.ts";

const caseOf = (...codes: string[]): RuleCase => ({
	codes,
	section: "scope",
	rule: "r",
	scenario: "s",
	passes: "p",
	fails: "f",
	graders: [{ kind: "tree", check: "c" }],
});

const ALPHA = caseOf("A1");
const BETA = caseOf("B1", "B2");
const GAMMA = caseOf("C1");

describe("the key of a case", () => {
	test("joins the codes with an underscore", () => {
		expect(caseKey(BETA)).toBe("B1_B2");
	});
});

describe("the sessions of a plan", () => {
	test("are the seeded cases times two arms times the runs", () => {
		const seeded = new Set(["A1", "B1_B2"]);

		const plan = planSessions([ALPHA, BETA, GAMMA], seeded, { runs: 3 });

		expect(plan.sessions).toHaveLength(2 * 2 * 3);
		expect(modelCalls(plan)).toBe(12);
		expect(plan.runs).toBe(3);
	});

	test("run the cases in order, each arm of a case together, and number the runs from 1", () => {
		const plan = planSessions([ALPHA, BETA], new Set(["A1", "B1_B2"]), {
			runs: 2,
		});

		expect(plan.sessions.map((s) => `${s.key}|${s.arm}|${s.run}`)).toEqual([
			"A1|main.md|1",
			"A1|main.md|2",
			"A1|the default body|1",
			"A1|the default body|2",
			"B1_B2|main.md|1",
			"B1_B2|main.md|2",
			"B1_B2|the default body|1",
			"B1_B2|the default body|2",
		]);
	});

	test("default to the runs a citable arm needs", () => {
		const plan = planSessions([ALPHA], new Set(["A1"]));

		expect(plan.runs).toBe(EVAL_MIN_RUNS_PER_ARM);
		expect(plan.sessions).toHaveLength(2 * EVAL_MIN_RUNS_PER_ARM);
	});

	test("leave a case with no fixture out and name it", () => {
		const plan = planSessions([ALPHA, GAMMA], new Set(["A1"]), { runs: 1 });

		expect(plan.unseeded).toEqual(["C1"]);
		expect(plan.sessions.every((s) => s.key === "A1")).toBe(true);
	});

	test("narrow to one case", () => {
		const plan = planSessions([ALPHA, BETA], new Set(["A1", "B1_B2"]), {
			runs: 1,
			only: "B1_B2",
		});

		expect(plan.sessions).toHaveLength(2);
		expect(plan.unseeded).toEqual([]);
	});

	test("narrow to one arm", () => {
		const plan = planSessions([ALPHA], new Set(["A1"]), {
			runs: 2,
			arm: "the default body",
		});

		expect(plan.sessions.map((s) => s.arm)).toEqual([
			"the default body",
			"the default body",
		]);
	});

	test("are empty for no cases", () => {
		const plan = planSessions([], new Set(), { runs: 5 });

		expect(modelCalls(plan)).toBe(0);
	});
});

describe("the arm names", () => {
	test("accepts the two arms and nothing else", () => {
		expect(isArm("main.md")).toBe(true);
		expect(isArm("the default body")).toBe(true);
		expect(isArm("plugin")).toBe(false);
	});
});
