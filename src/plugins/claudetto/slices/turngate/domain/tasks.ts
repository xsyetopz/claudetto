// The background-task part of the turn gate. It reads the task states of the `Stop` input, and makes no model call.
// The status `running` comes from `BackgroundTaskSummary` of the engine, so the check is on structure and not on words.

import { MAX_NAMED_TASKS } from "../limits.ts";
import { TASKS_REASON } from "../prompts.ts";

/** The fields of a `background_tasks` entry that the gate reads. */
export interface TaskSummary {
  readonly id: string;
  readonly status: string;
  readonly description: string;
}

/** The status of a task that is still in flight. */
export const RUNNING = "running";

/** The tasks of `tasks` that still run. A missing array has none. */
export const runningTasks = (
  tasks: readonly TaskSummary[] | undefined,
): TaskSummary[] => (tasks ?? []).filter((t) => t.status === RUNNING);

/** The block reason for tasks that still run: the id and the description of each, and the two ways out. */
export const tasksReason = (tasks: readonly TaskSummary[]): string => {
  const named = tasks
    .slice(0, MAX_NAMED_TASKS)
    .map((t) => `- \`${t.id}\`: ${t.description}`);
  const others = tasks.length - named.length;
  return TASKS_REASON({
    tasks: named.join("\n"),
    more: others > 0 ? `\nand ${others} more` : "",
  });
};
