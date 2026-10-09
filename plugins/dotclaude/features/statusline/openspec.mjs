// The newest active OpenSpec change of a project, read from the files.

import fs from "node:fs";
import path from "node:path";

/** The newest OpenSpec change in `dir` that has a `tasks.md`, with its done and total task counts. */
export function openspecChange(dir) {
  const changes = path.join(dir, "openspec", "changes");
  let newest = null;
  try {
    for (const id of fs.readdirSync(changes)) {
      if (id === "archive") continue;
      const file = path.join(changes, id, "tasks.md");
      if (!fs.existsSync(file)) continue;
      const mtime = fs.statSync(file).mtimeMs;
      if (!newest || mtime > newest.mtime) newest = { id, file, mtime };
    }
  } catch {
    return null;
  }
  if (!newest) return null;
  const text = fs.readFileSync(newest.file, "utf8");
  const done = text.match(/^\s*[-*] \[[xX]\]/gm)?.length ?? 0;
  const open = text.match(/^\s*[-*] \[ \]/gm)?.length ?? 0;
  return { id: newest.id, done, total: done + open };
}
