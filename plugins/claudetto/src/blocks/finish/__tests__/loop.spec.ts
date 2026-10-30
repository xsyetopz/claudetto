import { expect, test } from "bun:test";
import type { SessionMessage } from "claude-code";
import {
	appliedTasks,
	LOOP_BLOCKS_MAX,
	loopStep,
	nextOpen,
	progressOf,
} from "../loop.ts";

const TASKS = "/p/openspec/changes/c/tasks.md";

const user = (text: string): SessionMessage => ({
	role: "user",
	text,
	toolUses: [],
});

const call = (
	tool: string,
	input: Record<string, unknown>,
	isError?: true,
): SessionMessage => ({
	role: "assistant",
	text: "",
	toolUses: [
		{ tool_use_id: tool, tool, input, ...(isError ? { isError } : {}) },
	],
});

const APPLY = call("Skill", { skill: "openspec-apply-change" });

test("the bound is five blocks in a row", () => {
	expect(LOOP_BLOCKS_MAX).toBe(5);
});

test("the first open box gives its id and text, and a ticked file gives none", () => {
	const text = `## 1. A

- [x] 1.1 Done.
- [ ] 2.3 Build it. Verify: a test.
- [ ] 2.4 Later.`;
	expect(nextOpen(text)).toEqual({
		id: "2.3",
		task: "Build it. Verify: a test.",
	});
	expect(nextOpen("- [x] 1.1 Done.")).toBeUndefined();
});

test("a box marked `blocked:` is passed over, and a file of only blocked boxes gives none", () => {
	const text = `- [ ] 2.3 Build it. blocked: needs a login
- [ ] 2.4 Later.`;
	expect(nextOpen(text)).toEqual({ id: "2.4", task: "Later." });
	expect(nextOpen("- [ ] 9.3 Run it. `blocked: no yes`")).toBeUndefined();
});

test("an apply skill call, then an edit of a `tasks.md`, names that file", () => {
	expect(appliedTasks([APPLY, call("Edit", { file_path: TASKS })])).toEqual([
		TASKS,
	]);
});

test("the typed `/openspec-apply-change` command counts as an apply", () => {
	const typed = user("<command-name>/openspec-apply-change</command-name>");
	expect(appliedTasks([typed, call("Write", { file_path: TASKS })])).toEqual([
		TASKS,
	]);
});

test("a `tasks.md` edit with no apply, before the apply, or that failed names nothing", () => {
	expect(appliedTasks([call("Edit", { file_path: TASKS })])).toEqual([]);
	expect(appliedTasks([call("Edit", { file_path: TASKS }), APPLY])).toEqual([]);
	expect(
		appliedTasks([APPLY, call("Edit", { file_path: TASKS }, true)]),
	).toEqual([]);
	expect(appliedTasks([APPLY, call("Edit", { file_path: "/p/a.ts" })])).toEqual(
		[],
	);
});

test("progress counts each file edit of the session and the open box", () => {
	const one = progressOf(
		[APPLY, call("Edit", { file_path: "/p/a.ts" })],
		"2.3",
	);
	const two = progressOf(
		[
			APPLY,
			call("Edit", { file_path: "/p/a.ts" }),
			call("Write", { file_path: "/p/b.ts" }),
		],
		"2.3",
	);
	expect(one).not.toBe(two);
	expect(progressOf([APPLY], "2.3")).not.toBe(progressOf([APPLY], "2.4"));
});

test("blocks with no progress stop after the bound, and progress starts the count again", () => {
	let held: ReturnType<typeof loopStep>["held"] | undefined;
	const blocks: boolean[] = [];
	for (let at = 0; at <= LOOP_BLOCKS_MAX; at++) {
		const step = loopStep(held, "same");
		blocks.push(step.block);
		held = step.held;
	}
	expect(blocks).toEqual([true, true, true, true, true, false]);
	expect(loopStep(held, "moved")).toEqual({
		block: true,
		held: { count: 1, seen: "moved" },
	});
});

test("progress before the first block counts as one block", () => {
	expect(loopStep(undefined, "a")).toEqual({
		block: true,
		held: { count: 1, seen: "a" },
	});
});
