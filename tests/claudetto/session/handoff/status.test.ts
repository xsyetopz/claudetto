// The status of a handoff comes from checks, not from the model text (task 3.12, D48).
// The done state holds only the checked tasks of `tasks.md` with a passed check of the task.
// A checked box with no passed check of its task is open (task 6.2, "Box with No Check Is Open").

import { expect, test } from "bun:test";
import { passedChecks } from "../../../../plugins/claudetto/modules/project/domain/checks.ts";
import { handoffText } from "../../../../plugins/claudetto/modules/session/handoff/handover.ts";

/** The line of `text` that starts with `key`. */
const lineOf = (text: string, key: string): string =>
	text.split("\n").find((line) => line.startsWith(key)) ?? "";

const TASK_ID = /`\d+\.\d+`/;
const OPEN = "Open:";
const DONE = "Done:";
const PASSED = "Passed:";
const TASKS =
	"- [x] 1.1 First\n- [ ] 1.2 Second\n- [x] 1.3 Third\n- [ ] 1.4 Fourth\n";

/** The handoff of an empty session with the change `c`. */
const handoff = (tasks: string, checks: string[] = []) =>
	handoffText({ messages: [], name: "c", tasks, checks });

test("Box with No Check Is Open", () => {
	const text = handoff(TASKS);
	expect(lineOf(text, OPEN)).toContain("`1.1`");
	expect(lineOf(text, OPEN)).toContain("`1.3`");
	expect(lineOf(text, DONE)).not.toMatch(TASK_ID);
});

test("a checked box with a passed check is done", () => {
	const text = handoff(TASKS, ["just lab"]);
	expect(lineOf(text, DONE)).toContain("`1.1`");
	expect(lineOf(text, DONE)).toContain("`1.3`");
	expect(lineOf(text, OPEN)).not.toContain("`1.1`");
	expect(lineOf(text, DONE)).not.toContain("no passed check");
});

test("a long task line keeps its end, where the check is named", () => {
	const line = `Add the server. ${"Pad the line by 2 spaces. ".repeat(10)}Check: \`bun test\`.`;
	const text = handoff(`- [ ] 1.1 First\n- [ ] 1.2 ${line}\n`);
	expect(lineOf(text, OPEN)).toContain("Check: `bun test`.");
});

test("a task line that names a check needs that check, and a line that names none needs any passed check", () => {
	const tasks =
		"- [x] 2.1 Add the gate. Verify: `just lab`.\n- [x] 2.2 Add the doc.\n- [ ] 2.3 Next\n";
	const other = handoff(tasks, ["just check"]);
	expect(lineOf(other, OPEN)).toContain("`2.1`");
	expect(lineOf(other, DONE)).toContain("`2.2`");
	expect(lineOf(other, DONE)).not.toContain("`2.1`");
	const same = handoff(tasks, ["just lab"]);
	expect(lineOf(same, OPEN)).not.toMatch(TASK_ID);
	expect(lineOf(same, DONE)).toContain("`2.1`");
	expect(lineOf(same, DONE)).toContain("`2.2`");
	const longer = handoff(tasks, ["just lab x"]);
	expect(lineOf(longer, OPEN)).not.toMatch(TASK_ID);
});

const bash = (id: string, command: string, isError?: true) => ({
	role: "assistant" as const,
	text: "All checks pass, the work is DONE.",
	toolUses: [
		{
			tool_use_id: id,
			tool: "Bash",
			input: { command },
			text: "out",
			...(isError ? { isError } : {}),
		},
	],
});

test("the done list holds only checks that passed, not a claim of the model", () => {
	const messages = [
		bash("a", "just test tests/x.test.ts"),
		bash("b", "just lab", true),
		bash("c", "just check || true"),
		{ role: "assistant" as const, text: "just check passes", toolUses: [] },
	];
	const checks = passedChecks(messages);
	expect(checks).toEqual(["just test tests/x.test.ts"]);
	const text = handoffText({ messages: [], name: "c", tasks: TASKS, checks });
	expect(lineOf(text, PASSED)).toContain("`just test tests/x.test.ts`");
	expect(lineOf(text, PASSED)).not.toContain("`just lab`");
});

test("a later failure of a check removes its earlier pass", () => {
	const checks = passedChecks([
		bash("a", "just check"),
		bash("b", "just check", true),
	]);
	expect(checks).toEqual([]);
	expect(lineOf(handoff(TASKS, checks), PASSED)).toBe("");
});

test("with no open change, the passed checks still show", () => {
	const text = handoffText({ messages: [], checks: ["just check"] });
	expect(lineOf(text, PASSED)).toContain("`just check`");
	expect(text).toContain("No open change.");
});
