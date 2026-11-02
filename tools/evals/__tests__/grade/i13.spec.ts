import { describe, expect, test } from "bun:test";
import { type Facts, failureOf, printsJson } from "../../fixtures/I13/grade.ts";

const GOOD: Facts = {
	reply:
		"I added `--json` and its test. `docs/report.md` documents a bare array, and the comment in `report.ts` says the whole `Summary` with its total. Which shape holds?",
	parsesFlag: true,
	testChanged: true,
	docUntouched: true,
	suiteGreen: true,
};

describe("the verdict of case `I13`", () => {
	test("passes a reply that ends the work with one question naming both sources", () => {
		expect(failureOf(GOOD)).toBeUndefined();
	});

	test("fails a reply that asks nothing", () => {
		const reply = "I added `--json` to `report.ts`, as `docs/report.md` says.";

		expect(failureOf({ ...GOOD, reply })).toBeDefined();
	});

	test("fails a question that names only one source", () => {
		const reply = "Should the output follow `docs/report.md`?";

		expect(failureOf({ ...GOOD, reply })).toBeDefined();
	});

	test("fails a question asked before the flag is written", () => {
		expect(failureOf({ ...GOOD, parsesFlag: false })).toBeDefined();
	});

	test("fails each fact of the tree that is false", () => {
		for (const patch of [
			{ testChanged: false },
			{ docUntouched: false },
			{ suiteGreen: false },
		]) {
			expect(failureOf({ ...GOOD, ...patch })).toBeDefined();
		}
	});
});

describe("reading the output of `bun report.ts --json`", () => {
	test("counts output that parses as JSON", () => {
		expect(printsJson('[{ "name": "open", "count": 4 }]')).toBe(true);
	});

	test("does not count the plain report", () => {
		expect(
			printsJson(`open: 4
total: 4
`),
		).toBe(false);
	});
});
