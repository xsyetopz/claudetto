// The background-task part of the turn gate. It reads the task states of the `Stop` input, and makes no model call.
// The status `running` comes from `BackgroundTaskSummary` of the engine, so the check is on structure and not on words.
// A turn cannot make a task end, so the gate gives a notice and no block (D32).

import { TASKS_NOTICE } from "../prompts.ts";

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

/**
 * The notice for tasks that still run, with their count.
 * It is `undefined` when no task runs, or when the reply names each one by its id or its description.
 */
export const tasksNotice = (
  tasks: readonly TaskSummary[],
  reply: string,
): string | undefined => {
  const unnamed = tasks.filter(
    (t) =>
      !reply.includes(t.id) &&
      !(t.description !== "" && reply.includes(t.description)),
  );
  if (unnamed.length === 0) return undefined;
  const n = tasks.length;
  return TASKS_NOTICE({
    what: n === 1 ? "1 background task is" : `${n} background tasks are`,
  });
};
