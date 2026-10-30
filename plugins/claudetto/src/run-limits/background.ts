// The background tasks that are still in flight at Stop. Pure: the hook hands over the list the Stop
// input carries.

import { STOP_TASKS } from "./prompts.ts";

/** What a line needs of an entry of `background_tasks` (`BackgroundTaskSummary` of the engine's types). */
export interface Task {
	readonly id: string;
	readonly type: string;
	readonly status: string;
	readonly description: string;
}

/** The text for the tasks the Stop input lists, or `undefined` when none is in flight. */
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
