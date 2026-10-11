// The helpers that the tests share: the paths of the repository, a walk of a
// folder, and a temporary folder.
// A test file imports from here and keeps no copy of these helpers.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/** The root of the repository. */
export const REPO = path.resolve(import.meta.dirname, "../..");
/** The folder that holds the plugins. */
export const PLUGINS = path.join(REPO, "plugins");

const SKIP = ["node_modules"];

/**
 * The files under `dir`, found at any depth, as full paths.
 * `skip` holds folder names that the walk does not enter.
 * `keep(file)` selects the files to return.
 * A folder that does not exist gives an empty list.
 */
export function walk(dir, { skip = SKIP, keep = () => true } = {}) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return skip.includes(entry.name) ? [] : walk(full, { skip, keep });
    }
    return keep(full) ? [full] : [];
  });
}

/**
 * A new temporary folder whose name starts with `prefix`.
 * `tests/support/tmp-root.mjs` moves the temporary folder of the process,
 * and it removes the folder at exit, so a test does not free it.
 */
export function tmpDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}-`));
}
