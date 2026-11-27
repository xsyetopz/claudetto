import { type Rec, rec, str } from "./line/input";
import type { Task } from "./line/state";

const STATUS: Readonly<Record<string, Task["status"]>> = {
	pending: "pending",
	in_progress: "in_progress",
	completed: "completed"
};

/** The list `TodoWrite`'s input sets: the whole list, numbered from 1. */
const todoTasks = (input: Rec | undefined): readonly Task[] | undefined => {
	const todos = input?.["todos"];
	if (!Array.isArray(todos)) {
		return undefined;
	}
	return todos.flatMap((item: unknown, index): Task[] => {
		const row = rec(item);
		const subject = str(row?.["content"]);
		const status = STATUS[str(row?.["status"]) ?? ""];
		const active = str(row?.["activeForm"]);
		return subject === undefined || status === undefined
			? []
			: [
					{
						id: String(index + 1),
						subject,
						status,
						...(active === undefined ? {} : { active })
					}
				];
	});
};

/** `tasks` after a `TaskUpdate` with `input`: a new status, subject or active form, or the task gone on `deleted`. */
const updated = (
	tasks: readonly Task[],
	input: Rec | undefined
): readonly Task[] => {
	const id = str(input?.["taskId"]);
	const raw = str(input?.["status"]);
	if (raw === "deleted") {
		return tasks.filter((task) => task.id !== id);
	}
	const status = STATUS[raw ?? ""];
	const subject = str(input?.["subject"]);
	const active = str(input?.["activeForm"]);
	return tasks.map((task) =>
		task.id === id
			? {
					...task,
					...(status === undefined ? {} : { status }),
					...(subject === undefined ? {} : { subject }),
					...(active === undefined ? {} : { active })
				}
			: task
	);
};

/** The task `TaskCreate` reported: its result names the id and subject (`{ task: { id, subject } }`). */
const created = (
	tasks: readonly Task[],
	input: Rec | undefined,
	result: unknown
): readonly Task[] => {
	const task = rec(rec(result)?.["task"]);
	const id = str(task?.["id"]);
	const subject = str(task?.["subject"]) ?? str(input?.["subject"]);
	const active = str(input?.["activeForm"]);
	return id === undefined || subject === undefined
		? tasks
		: [
				...tasks.filter((item) => item.id !== id),
				{
					id,
					subject,
					status: "pending",
					...(active === undefined ? {} : { active })
				}
			];
};

/**
 * The task list after a call to `tool` with `input` that returned `result`, or
 * `undefined` when the call is no task call. Claude Code 2.1.329 keeps tasks
 * with `TaskCreate` and `TaskUpdate`, and older sessions with `TodoWrite`.
 */
export const tasksAfter = (
	tasks: readonly Task[],
	tool: string,
	input: unknown,
	result?: unknown
): readonly Task[] | undefined => {
	const args = rec(input);
	if (tool === "TodoWrite") {
		return todoTasks(args);
	}
	if (tool === "TaskUpdate") {
		return updated(tasks, args);
	}
	return tool === "TaskCreate" ? created(tasks, args, result) : undefined;
};
