import { STOP_TASKS } from "./prompts.ts";

export interface Task {
	readonly id: string;
	readonly type: string;
	readonly status: string;
	readonly description: string;
}

export const tasksText = (
	tasks: readonly Task[] | undefined,
): string | undefined =>
	tasks === undefined || tasks.length === 0
		? undefined
		: STOP_TASKS({
				lines: tasks.map(
					(task) =>
						`- ${task.type} \`${task.id}\` (${task.status}): ${task.description}`,
				),
			});

/** The `id` and `status` of each task, so a repeat of the same list is told from a change. */
export const tasksKey = (tasks: readonly Task[] | undefined): string =>
	(tasks ?? [])
		.map((task) => JSON.stringify([task.id, task.status]))
		.sort()
		.join("\n");
