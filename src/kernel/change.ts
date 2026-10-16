// The task state of a MiniSpec change, read from the text of its `tasks.md`.
// The `minispec` CLI and the handoff share these rules, and neither imports the other.
// The file has no import beyond `paths.ts`, so the module graph of a hooks module can use it.

import { CHANGE_HANDOFF_FILE, CHANGES_DIR } from "./paths.ts";

/** A task line starts a line: `- [ ] 1.1 text` or `- [x] 1.1 text`. The group 1 is the mark, and the group 2 is the id. */
export const TASK_LINE = /^- \[([ xX])\] (\S+)/;

/** The count of checked tasks, the count of all tasks, and the id of the first open task or `null`. */
export interface TaskCounts {
  readonly done: number;
  readonly total: number;
  readonly next: string | null;
}

/** The counts of the tasks in `tasks`, the text of a `tasks.md`. */
export const countTasks = (tasks: string): TaskCounts => {
  let done = 0;
  let total = 0;
  let next: string | null = null;
  for (const line of tasks.split("\n")) {
    const m = TASK_LINE.exec(line);
    if (!m) continue;
    total++;
    if (m[1] === " ") next ??= m[2] ?? "";
    else done++;
  }
  return { done, total, next };
};

/** The path of the handoff file of the change `name`, from the project root. */
export const changeHandoffPath = (name: string): string =>
  `${CHANGES_DIR}/${name}/${CHANGE_HANDOFF_FILE}`;

/** The change in progress: its name and its first open task. */
export interface OpenChange {
  readonly name: string;
  readonly next: string;
}

/**
 * The change in progress among `changes`, the names with the text of their `tasks.md` or `null` for no file:
 * the first by name that has an open task.
 */
export const openChange = (
  changes: readonly { readonly name: string; readonly tasks: string | null }[],
): OpenChange | null => {
  for (const { name, tasks } of [...changes].sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
  )) {
    const next = tasks === null ? null : countTasks(tasks).next;
    if (next !== null) return { name, next };
  }
  return null;
};
