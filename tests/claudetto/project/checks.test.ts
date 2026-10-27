// The passed checks of a session, the task lines of a `tasks.md`, and the proof of a task by a passed check (`modules/project/domain/checks.ts`).

import { expect, test } from "bun:test";
import {
	passedChecks,
	proven,
	taskLines,
} from "../../../plugins/claudetto/modules/project/domain/checks.ts";

const bash = (
	id: string,
	command: string,
	extra: object = {},
	input: Record<string, unknown> = { command },
) => ({
	role: "assistant" as const,
	text: "",
	toolUses: [
		{
			tool_use_id: id,
			tool: "Bash",
			input,
			text: "out",
			...extra,
		},
	],
});

test("a `Bash` use that runs in the background has no outcome, so it is not a passed check", () => {
	const use = bash(
		"a",
		"just check",
		{},
		{
			command: "just check",
			run_in_background: true,
		},
	);
	expect(passedChecks([use])).toEqual([]);
});

test("`just docker` with a recipe is a check, and a shell operator is not", () => {
	const checks = passedChecks([
		bash("a", "just docker check"),
		bash("b", "just docker test tests/x.test.ts"),
		bash("c", "just docker check; true"),
		bash("d", "just docker build"),
	]);
	expect(checks).toEqual([
		"just docker check",
		"just docker test tests/x.test.ts",
	]);
});

test("a check with an error is not passed, and a later failure removes an earlier pass", () => {
	expect(passedChecks([bash("a", "just lab", { isError: true })])).toEqual([]);
	expect(
		passedChecks([
			bash("a", "just check"),
			bash("b", "just check", { isError: true }),
		]),
	).toEqual([]);
});

test("task lines are read by id from a `tasks.md`, with the state of the box", () => {
	const lines = taskLines(
		"# T\n- [x] 1.1 One\n  - [ ] 1.1.1 Sub\n- [ ] 1.2 Two\n",
	);
	expect([...lines.keys()]).toEqual(["1.1", "1.2"]);
	expect(lines.get("1.1")).toEqual({ on: true, line: "- [x] 1.1 One" });
	expect(lines.get("1.2")).toEqual({ on: false, line: "- [ ] 1.2 Two" });
});

test("a task line that names no check needs any passed check, and one that names checks needs one of them", () => {
	expect(proven("- [x] 10.1 Add the test", [])).toBe(false);
	expect(proven("- [x] 10.1 Add the test", ["just check"])).toBe(true);
	expect(proven("- [x] 10.2 Run `just lab`", ["just check"])).toBe(false);
	expect(proven("- [x] 10.2 Run `just lab`", ["just lab"])).toBe(true);
	expect(proven("- [x] 10.3 Run `bun test`", ["bun test tests/a"])).toBe(true);
});
