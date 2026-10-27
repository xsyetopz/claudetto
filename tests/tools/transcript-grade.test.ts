// The offline grader lists each grader type or field that it does not model, and `failedGraders` throws on them.

import { expect, test } from "bun:test";
import {
	failedGraders,
	type Grader,
	graderFaults,
} from "../../tools/transcript-grade.ts";

const run = { events: [], files: {} };
const g = (o: object): Grader[] => [{ name: "g", type: "regex", ...o }];

test("a modelled regex and tool_used grader is graded", () => {
	expect(failedGraders(g({ pattern: "x" }), run)).toEqual(["g"]);
	expect(failedGraders(g({ type: "tool_used", tool: "Bash" }), run)).toEqual([
		"g",
	]);
});

test("an unmodelled grader type is a fault, and failedGraders throws", () => {
	expect(graderFaults(g({ type: "tool_order" }))).toHaveLength(1);
	expect(graderFaults(g({ type: "file_exists" }))).toHaveLength(1);
	expect(() => failedGraders(g({ type: "tool_order" }), run)).toThrow();
});

test("an unmodelled field or target is a fault", () => {
	const faults = (o: object) => graderFaults(g({ pattern: "x", ...o }));
	expect(faults({ match: "count:2" })).toHaveLength(1);
	expect(faults({ match: "not_contains" })).toEqual([]);
	expect(faults({ target: "trace" })).toEqual([]);
	expect(faults({ target: "files" })).toHaveLength(1);
	expect(faults({ target: "mock_calls" })).toHaveLength(1);
	expect(faults({})).toEqual([]);
});

test("a regex grader on the trace reads the events as JSON lines", () => {
	const events = [
		{
			type: "assistant",
			message: {
				content: [
					{ type: "tool_use", name: "Edit", input: { file_path: "a" } },
				],
			},
		},
	];
	const traced = { events, files: {} };
	const grader = (pattern: string) => g({ pattern, target: "trace" });
	expect(failedGraders(grader('"name":"Edit"'), traced)).toEqual([]);
	expect(failedGraders(grader('"name":"Write"'), traced)).toEqual(["g"]);
});

test("a regex needs a pattern and a tool_used needs a tool", () => {
	expect(graderFaults(g({}))).toHaveLength(1);
	expect(graderFaults(g({ type: "tool_used" }))).toHaveLength(1);
	expect(graderFaults(g({ type: "llm", criteria: "c" }))).toEqual([]);
});

test("a `not_contains` regex grader passes when the regex finds nothing", () => {
	const files = { "a.txt": "abc" };
	const target = { source: "file", path: "a.txt" };
	const notContains = (pattern: string) =>
		failedGraders(g({ pattern, target, match: "not_contains" }), {
			events: [],
			files,
		});
	expect(notContains("zzz")).toEqual([]);
	expect(notContains("b")).toEqual(["g"]);
});
