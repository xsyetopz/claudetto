import { describe, expect, test } from "claude-code/testing";

import { activityOf, tasksAfter } from "../activity";
import type { Task } from "../line/state";

describe("activity", () => {
	test("names a built-in call by its tool and the file it works on", () => {
		// Act and Assert
		expect(activityOf("Read", { file_path: "/r/src/main.ts" })).toBe(
			"Read main.ts"
		);
	});

	test("names an MCP call by its own tool name and the subject under input", () => {
		// Act and Assert
		expect(
			activityOf("mcp__claudetto__web_search", {
				input: { query: "bun spawn" }
			})
		).toBe("web_search bun spawn");
	});

	test("cuts a long subject with an ellipsis", () => {
		// Act
		const text = activityOf("Bash", { command: "x".repeat(100) });

		// Assert
		expect(text).toHaveLength(48);
		expect(text.endsWith("…")).toBe(true);
	});
});

describe("tasks", () => {
	const LIST: readonly Task[] = [
		{ id: "1", subject: "Read", status: "pending" },
		{ id: "2", subject: "Test", status: "pending" }
	];

	test("adds the task TaskCreate reports, by the id in its result", () => {
		// Act
		const tasks = tasksAfter(
			[],
			"TaskCreate",
			{ subject: "Read" },
			{
				task: { id: "1", subject: "Read" }
			}
		);

		// Assert
		expect(tasks).toEqual([{ id: "1", subject: "Read", status: "pending" }]);
	});

	test("sets a task's status with TaskUpdate and drops it on deleted", () => {
		// Act
		const started = tasksAfter(LIST, "TaskUpdate", {
			taskId: "1",
			status: "in_progress",
			activeForm: "Reading"
		});
		const dropped = tasksAfter(LIST, "TaskUpdate", {
			taskId: "2",
			status: "deleted"
		});

		// Assert
		expect(started?.[0]).toEqual({
			id: "1",
			subject: "Read",
			status: "in_progress",
			active: "Reading"
		});
		expect(dropped).toEqual([LIST[0]]);
	});

	test("leaves the list alone for a call that is no task call", () => {
		// Act and Assert
		expect(tasksAfter(LIST, "Read", {})).toBeUndefined();
	});
});
