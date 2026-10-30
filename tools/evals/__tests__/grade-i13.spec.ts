import { describe, expect, test } from "bun:test";
import {
	type Facts,
	failureOf,
	type Step,
	stepsOf,
} from "../fixtures/I13/grade.ts";

const call = (name: string, path = ""): Step => ({ name, path });

const GOOD: Facts = {
	steps: [
		call("Edit", "/w/report.ts"),
		call("Edit", "/w/report.test.ts"),
		call("AskUserQuestion"),
	],
	parsesFlag: true,
	testChanged: true,
	docUntouched: true,
	suiteGreen: true,
};

const line = (...blocks: object[]): string =>
	JSON.stringify({ type: "assistant", message: { content: blocks } });

describe("reading a transcript", () => {
	test("keeps the tool calls in order, across lines and within one", () => {
		const text = `${line({ type: "text", text: "hi" })}
${line(
	{
		type: "tool_use",
		name: "Edit",
		input: { file_path: "/w/report.ts" },
	},
	{ type: "tool_use", name: "AskUserQuestion", input: {} },
)}`;

		expect(stepsOf(text)).toEqual([
			{ name: "Edit", path: "/w/report.ts" },
			{ name: "AskUserQuestion", path: "" },
		]);
	});

	test("skips a line that is not JSON and an event with no message", () => {
		const text = ["not json", JSON.stringify({ type: "result" }), ""].join(
			"\n",
		);

		expect(stepsOf(text)).toEqual([]);
	});
});

describe("the verdict of case `I13`", () => {
	test("passes when both edits precede the one question", () => {
		expect(failureOf(GOOD)).toBeUndefined();
	});

	test("passes when the edits come in either order", () => {
		const steps = [
			call("Write", "/w/report.test.ts"),
			call("MultiEdit", "/w/report.ts"),
			call("AskUserQuestion"),
		];

		expect(failureOf({ ...GOOD, steps })).toBeUndefined();
	});

	test("fails a question before the first edit", () => {
		const steps = [call("AskUserQuestion"), ...GOOD.steps.slice(0, 2)];

		expect(failureOf({ ...GOOD, steps })).toBeDefined();
	});

	test("fails a question between the two edits", () => {
		const steps = [
			call("Edit", "/w/report.ts"),
			call("AskUserQuestion"),
			call("Edit", "/w/report.test.ts"),
		];

		expect(failureOf({ ...GOOD, steps })).toBeDefined();
	});

	test("fails a second question", () => {
		const steps = [...GOOD.steps, call("AskUserQuestion")];

		expect(failureOf({ ...GOOD, steps })).toBeDefined();
	});

	test("fails a session that never asked", () => {
		const steps = GOOD.steps.slice(0, 2);

		expect(failureOf({ ...GOOD, steps })).toBeDefined();
	});

	test("fails when no edit of the test file is in the transcript", () => {
		const steps = [call("Edit", "/w/report.ts"), call("AskUserQuestion")];

		expect(failureOf({ ...GOOD, steps })).toBeDefined();
	});

	test("fails each fact of the tree that is false", () => {
		for (const patch of [
			{ parsesFlag: false },
			{ testChanged: false },
			{ docUntouched: false },
			{ suiteGreen: false },
		]) {
			expect(failureOf({ ...GOOD, ...patch })).toBeDefined();
		}
	});
});
