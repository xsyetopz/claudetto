// The active MiniSpec change, for the change segment: the task counts of `minispec/changes/<name>/tasks.md`.
// The change in progress is the first change, by name, with an open task.
// When no change has an open task, it is the first change by name.
// The `archive` folder holds the finished changes, so it is not a change.

import path from "node:path";
import { countTasks } from "../../../../../kernel/change.ts";
import { failureText } from "../../../../../kernel/node/hook-io.ts";
import { CHANGES_DIR } from "../../../../../kernel/paths.ts";
import type { FileReader } from "../../../../../kernel/ports.ts";
import type { Change } from "../domain/types.ts";

/** The folder in `CHANGES_DIR` that holds the archived changes. */
const ARCHIVE_DIR = "archive";

/** The state of the change `name` from the text of its `tasks.md`. */
export const changeOf = (name: string, tasks: string): Change => {
  const { done, total, next } = countTasks(tasks);
  if (total === 0) return { name, state: "planning" };
  if (next === null) return { name, state: "done", total };
  return { name, state: "open", done, total, next };
};

/** The state of one change folder, or `null` for a folder that holds no `tasks.md` and no `proposal.md`, which is no change. */
const readChange = async (
  dir: string,
  name: string,
  files: FileReader,
  onError: (text: string) => void,
): Promise<Change | null> => {
  try {
    const tasks = await files.read(path.join(dir, name, "tasks.md"));
    if (tasks !== null) return changeOf(name, tasks);
    const proposal = await files.read(path.join(dir, name, "proposal.md"));
    return proposal === null ? null : { name, state: "planning" };
  } catch (err) {
    onError(failureText(err));
    return { name, state: "error" };
  }
};

/** The active change of the project at `root`, or `null` when there is none. A read that fails gives the change with the state `error`, and the cause goes to `onError`. */
export const activeChange = async (
  root: string,
  files: FileReader,
  onError: (text: string) => void,
): Promise<Change | null> => {
  const dir = path.join(root, CHANGES_DIR);
  let names: string[];
  try {
    names = await files.list(dir);
  } catch (err) {
    onError(failureText(err));
    return null;
  }
  const changes: Change[] = [];
  for (const name of names.filter((n) => n !== ARCHIVE_DIR).sort()) {
    const change = await readChange(dir, name, files, onError);
    if (change) changes.push(change);
  }
  return changes.find((c) => c.state === "open") ?? changes[0] ?? null;
};
