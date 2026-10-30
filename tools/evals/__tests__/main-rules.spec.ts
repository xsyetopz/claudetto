import { describe, expect, test } from "bun:test";
import {
	caseFaults,
	plannedRuns,
	type RuleCase,
	replyOnlyCases,
	sectionsOf,
} from "../main-rules.ts";

const sound = (): RuleCase => ({
	codes: ["R1"],
	section: "defects",
	rule: "a rule",
	scenario: "a scenario",
	passes: "a decision",
	fails: "a failure",
	graders: [{ kind: "tree", check: "a command" }],
});

describe("the shipped inventory", () => {
	test("the shipped inventory has no fault", async () => {
		expect(await caseFaults()).toEqual([]);
	});
});

describe("the check reports a case that holds nothing", () => {
	test("a case whose section is not in the file is named", async () => {
		const cases = [{ ...sound(), section: "nosuch" }];

		const faults = await caseFaults(cases);

		expect(faults).toEqual(["R1: agents/main.md has no <nosuch> section"]);
	});

	test("a case with an empty field is named", async () => {
		const cases = [{ ...sound(), passes: "  " }];

		const faults = await caseFaults(cases);

		expect(faults).toEqual(["R1: the case has no passes"]);
	});

	test("a case with no code is named", async () => {
		const cases = [{ ...sound(), codes: [] }];

		const faults = await caseFaults(cases);

		expect(faults).toEqual(["a rule: no code records the failure"]);
	});
});

describe("the check reports a grader that cannot be trusted", () => {
	test("a case with no grader at all is named", async () => {
		const cases = [{ ...sound(), graders: [] }];

		const faults = await caseFaults(cases);

		expect(faults).toEqual([
			"R1: the case names no grader, so a run cannot score it",
		]);
	});

	test("a tree grader with no check is named", async () => {
		const cases: RuleCase[] = [
			{ ...sound(), graders: [{ kind: "tree", check: " " }] },
		];

		const faults = await caseFaults(cases);

		expect(faults).toEqual(["R1: a tree grader names no check"]);
	});

	test("a reply grader that does not justify itself is named", async () => {
		const cases: RuleCase[] = [
			{
				...sound(),
				graders: [{ kind: "reply", reads: "the reply", whyNotTree: "" }],
			},
		];

		const faults = await caseFaults(cases);

		expect(faults).toEqual([
			"R1: a reply grader does not say why no command over the tree can decide the case",
		]);
	});
});

describe("the cases a model has to score by reading", () => {
	test("no shipped case rests on a reply grader alone", () => {
		expect(replyOnlyCases()).toEqual([]);
	});

	test("a case with only a reply grader is reported", () => {
		const cases: RuleCase[] = [
			{
				...sound(),
				graders: [
					{ kind: "reply", reads: "the reply", whyNotTree: "nothing changes" },
				],
			},
		];

		expect(replyOnlyCases(cases)).toEqual(["R1"]);
	});
});

describe("the sections of a prompt file", () => {
	test("reads each opening tag in the order of the file", () => {
		const text = `<role>
work
</role>

<code>
read it
</code>
`;

		expect(sectionsOf(text)).toEqual(["role", "code"]);
	});

	test("an inline tag of the prose is not a section", () => {
		expect(sectionsOf("a line with <b> in it\n")).toEqual([]);
	});
});

describe("the run the cases would need", () => {
	test("a citable run is eight cases, two arms, and ten runs each", () => {
		expect(plannedRuns()).toBe(160);
	});
});
