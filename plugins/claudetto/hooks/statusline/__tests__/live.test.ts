import { describe, expect, test } from "claude-code/testing";

import { serve } from "./serve";

const TURN = { text: "", turnId: "t1" };
const DONE = {
	answer: "",
	durationMs: 1,
	isAborted: false,
	turnId: "t1",
	reason: "answer"
} as const;

describe("live state", () => {
	test("is working during a turn and waiting for the next prompt once it ends", async ($, on) => {
		// Arrange
		const state = serve(on);

		// Act
		await $.turn.start(TURN);
		const during = state();
		await $.turn.complete(DONE);

		// Assert
		expect(during?.phase).toBe("working");
		expect(state()?.phase).toBe("idle");
		expect(state()?.waiting).toEqual({ kind: "input" });
	});

	test("records the permission dialog a call opens, then clears it when a tool runs", async ($, on) => {
		// Arrange
		const state = serve(on);
		const call = {
			tool: "mcp__claudetto__web_search" as const,
			input: { query: "x" },
			query: "x",
			tool_use_id: "u1"
		};

		// Act
		await $.tool.check(call);
		const checked = state();
		await $.classic.PermissionRequest({
			tool_name: call.tool,
			tool_input: call.input
		});
		const asked = state();
		await $.tool.run(call);
		const answered = state();

		// Assert
		expect(checked?.waiting).toBeUndefined();
		expect(asked?.waiting).toEqual({
			kind: "permission",
			tool: "mcp__claudetto__web_search"
		});
		expect(answered?.waiting).toBeUndefined();
	});

	test("records the question AskUserQuestion puts to the person", async ($, on) => {
		// Arrange
		const state = serve(on);

		// Act
		await $.tool.check({
			tool: "AskUserQuestion",
			input: {},
			tool_use_id: "u2"
		});

		// Assert
		expect(state()?.waiting).toEqual({
			kind: "question",
			tool: "AskUserQuestion"
		});
	});

	test("counts each started call", async ($, on) => {
		// Arrange
		const state = serve(on);

		// Act
		await $.tool.run({
			tool: "Read",
			tool_use_id: "r1",
			file_path: "/r/src/main.ts"
		});
		await $.tool.run({
			tool: "Bash",
			tool_use_id: "r2",
			command: "git status"
		});

		// Assert
		expect(state()?.tools).toBe(2);
	});

	test("keeps the task list a TodoWrite call sets", async ($, on) => {
		// Arrange
		const state = serve(on);
		const todos = [
			{ content: "Read", status: "completed" as const, activeForm: "Reading" },
			{ content: "Test", status: "in_progress" as const, activeForm: "Testing" }
		];

		// Act
		await $.tool.run({ tool: "TodoWrite", tool_use_id: "r3", todos });

		// Assert
		expect(state()?.tasks).toEqual([
			{ id: "1", subject: "Read", status: "completed", active: "Reading" },
			{ id: "2", subject: "Test", status: "in_progress", active: "Testing" }
		]);
	});

	test("adds the task TaskCreate reports and drops it again on a deleted TaskUpdate", async ($, on) => {
		// Arrange
		const state = serve(on, { task: { id: "1", subject: "Read" } });

		// Act
		await $.tool.run({
			tool: "TaskCreate",
			tool_use_id: "r6",
			subject: "Read",
			description: "d"
		});
		const created = state()?.tasks;
		await $.tool.run({
			tool: "TaskUpdate",
			tool_use_id: "r7",
			taskId: "1",
			status: "deleted"
		});

		// Assert
		expect(created).toEqual([{ id: "1", subject: "Read", status: "pending" }]);
		expect(state()?.tasks).toEqual([]);
	});
});
