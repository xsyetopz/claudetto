// The task state of an openspec change, read from the text of its `tasks.md`. No import, for the hooks module.

/** A task line: `- [ ] 1.1 text` or `- [x] 1.1 text`. Group 1 is the mark, and group 2 is the id. */
export const TASK_LINE = /^- \[([ xX])\] (\S+)/;

/** The next task is the first open task after the last checked task, or else the first open task. */
export const countTasks = (tasks: string) => {
  const doneIds: string[] = [];
  let total = 0;
  let first: string | null = null;
  let after: string | null = null;
  for (const line of tasks.split("\n")) {
    const m = TASK_LINE.exec(line);
    if (!m) continue;
    total++;
    const id = m[2] ?? "";
    if (m[1] !== " ") {
      doneIds.push(id);
      after = null;
    } else {
      first ??= id;
      after ??= id;
    }
  }
  return { done: doneIds.length, total, next: after ?? first, doneIds };
};

/** The change in progress: its name, its next open task, and the ids of its checked tasks (D48). */
export interface OpenChange {
  readonly name: string;
  readonly next: string;
  readonly done: readonly string[];
}

/** The first change by name that has an open task, from the names with the text of their `tasks.md` or `null`. */
export const openChange = (
  changes: readonly { readonly name: string; readonly tasks: string | null }[],
): OpenChange | null => {
  for (const { name, tasks } of [...changes].sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
  )) {
    const counts = tasks === null ? null : countTasks(tasks);
    if (counts?.next != null)
      return { name, next: counts.next, done: counts.doneIds };
  }
  return null;
};
