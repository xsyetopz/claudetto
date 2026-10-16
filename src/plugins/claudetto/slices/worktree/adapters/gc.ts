// The gc record of a worktree that `WorktreeCreate` made.
// The `gc` slice sweeps a worktree only when the record names it, and a worktree from this hook comes from no `Bash` call.
// The record file and its format are the ones of the `gc` slice, from `src/kernel/gc-record.ts`.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  type GcRecord,
  gcDirOf,
  parseRecords,
  serialize,
  withOutputs,
} from "../../../../../kernel/gc-record.ts";
import { writeAtomic } from "../../../../../kernel/node/fs.ts";

/** The session name in a record when the hook input has no `session_id`. */
const NO_SESSION = "worktree-hook";

/** Adds the worktree `dest` of the repository `root` to the gc record file of `session`. */
export const recordWorktree = async (
  root: string,
  dest: string,
  session: string | undefined,
): Promise<void> => {
  const id = session && /^[\w.-]+$/.test(session) ? session : NO_SESSION;
  const file = path.join(gcDirOf(os.homedir()), `${id}.json`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const old = fs.existsSync(file) ? await Bun.file(file).text() : "";
  const added: GcRecord = {
    path: dest,
    kind: "worktree",
    session: id,
    time: Date.now(),
    cwd: root,
  };
  await writeAtomic(file, serialize(withOutputs(parseRecords(old), [added])));
};
