// The active openspec change: the task counts of `openspec/changes/<name>/tasks.md`.
// It is the first change by name with an open task, or else the first change. The `archive` folder is not a change.
import path from "node:path";
import { failureText } from "../../../kernel/node/hook-io.ts";
import type { FileReader } from "../../../kernel/ports.ts";
import { CHANGES_DIR, countTasks, openChange } from "../../project/index.ts";
import type { Change } from "../types.ts";

export const changeOf = (name: string, tasks: string): Change => {
  const { done, total, next } = countTasks(tasks);
  if (total === 0) return { name, state: "planning" };
  return next === null
    ? { name, state: "done", total }
    : { name, state: "open", done, total, next };
};

export const activeChange = async (
  root: string,
  files: FileReader,
  onError: (text: string) => void,
): Promise<Change | undefined> => {
  const failed = (err: unknown) => void onError(failureText(err));
  // The session folder can be below the project root, so walk up to the first folder with a change.
  let dir: string;
  let names: string[] | undefined;
  for (let at = root; ; at = path.dirname(at)) {
    dir = path.join(at, CHANGES_DIR);
    names = await files.list(dir).catch((err) => {
      failed(err);
      return undefined;
    });
    if (names?.length || path.dirname(at) === at) break;
  }
  const changes: Change[] = [];
  const read: { name: string; tasks: string }[] = [];
  for (const name of (names ?? []).filter((n) => n !== "archive").sort())
    try {
      const tasks = await files.read(path.join(dir, name, "tasks.md"));
      // A folder with neither `tasks.md` nor `proposal.md` is no change.
      if (tasks !== null) {
        read.push({ name, tasks });
        changes.push(changeOf(name, tasks));
      } else if (
        (await files.read(path.join(dir, name, "proposal.md"))) !== null
      )
        changes.push({ name, state: "planning" });
    } catch (err) {
      failed(err);
      changes.push({ name, state: "error" });
    }
  const open = openChange(read);
  return changes.find((c) => c.name === open?.name) ?? changes[0];
};
