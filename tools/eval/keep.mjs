// The trace of one run in the results folder: the files that the run added or changed, and its stream events.
// The work folder is deleted after the run, so this is the only place to read what the run did.

import fs from "node:fs";
import path from "node:path";
import { hashTree } from "./oracle.mjs";

/**
 * Copies to `<keepDir>/work/<case>-<arm>-<run>/` each file of `workDir` that is new or has another hash than in `before` (the tree hashes of the snapshot).
 * A file that `generate` made and the run left as it was is not copied.
 * Writes `events.jsonl` there too.
 * Returns the folder, or `null` when `keepDir` is not set.
 */
export function keepRun(keepDir, name, { before, workDir, events }) {
  if (!keepDir) return null;
  const dest = path.join(keepDir, "work", name);
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });
  const after = hashTree(workDir);
  for (const f of Object.keys(after).filter(
    (f) => before.tree[f] !== after[f],
  )) {
    fs.mkdirSync(path.dirname(path.join(dest, f)), { recursive: true });
    fs.copyFileSync(path.join(workDir, f), path.join(dest, f));
  }
  fs.writeFileSync(
    path.join(dest, "events.jsonl"),
    events.map((e) => `${JSON.stringify(e)}\n`).join(""),
  );
  return dest;
}
