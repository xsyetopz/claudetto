// The active openspec change: the task counts of `openspec/changes/<name>/tasks.md`.
// It is the first change by name with an open task, or else the first change. The `archive` folder is not a change.
import path from "node:path";
import { countTasks } from "../../../kernel/change.ts";
import { failureText } from "../../../kernel/node/hook-io.ts";
import { CHANGES_DIR } from "../../../kernel/paths.ts";
import type { FileReader } from "../../../kernel/ports.ts";
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
): Promise<Change | null> => {
  const failed = (err: unknown) => void onError(failureText(err));
  // The session folder can be below the project root, so walk up to the first folder with a change.
  let dir: string;
  let names: string[] | null;
  for (let at = root; ; at = path.dirname(at)) {
    dir = path.join(at, CHANGES_DIR);
    names = await files.list(dir).catch((err) => {
      failed(err);
      return null;
    });
    if (names?.length || path.dirname(at) === at) break;
  }
  const changes: Change[] = [];
  for (const name of (names ?? []).filter((n) => n !== "archive").sort())
    try {
      const tasks = await files.read(path.join(dir, name, "tasks.md"));
      // A folder with neither `tasks.md` nor `proposal.md` is no change.
      if (tasks !== null) changes.push(changeOf(name, tasks));
      else if ((await files.read(path.join(dir, name, "proposal.md"))) !== null)
        changes.push({ name, state: "planning" });
    } catch (err) {
      failed(err);
      changes.push({ name, state: "error" });
    }
  return changes.find((c) => c.state === "open") ?? changes[0] ?? null;
};
