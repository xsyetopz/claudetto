// The newest active OpenSpec change of a project, read from the files.

import fs from "node:fs";
import path from "node:path";
import { rethrowUnless, UNREADABLE } from "../../lib/errors.ts";
import type { Spec } from "./types.ts";

/** The newest OpenSpec change in `dir` that has a `tasks.md`, with its done and total task counts. */
export async function openspecChange(dir: string): Promise<Spec | null> {
  const changes = path.join(dir, "openspec", "changes");
  let newest: { id: string; file: string; mtime: number } | null = null;
  try {
    for (const id of fs.readdirSync(changes)) {
      if (id === "archive") continue;
      const file = path.join(changes, id, "tasks.md");
      const tasks = Bun.file(file);
      if (!(await tasks.exists())) continue;
      const mtime = (await tasks.stat()).mtimeMs;
      if (!newest || mtime > newest.mtime) newest = { id, file, mtime };
    }
  } catch (err) {
    // A project with no `openspec/changes` folder, or a change that goes away during the scan, has no active change.
    rethrowUnless(err, ...UNREADABLE);
    return null;
  }
  if (!newest) return null;
  const text = await Bun.file(newest.file).text();
  const done = text.match(/^\s*[-*] \[[xX]\]/gm)?.length ?? 0;
  const open = text.match(/^\s*[-*] \[ \]/gm)?.length ?? 0;
  return { id: newest.id, done, total: done + open };
}
