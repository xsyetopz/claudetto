// The edits of the user: the changed files that no line of the edit ledger made (D6 of change `redesign-0-4-0`).
// The caller gives each read as a port, because the mod runtime follows `$` into no imported arrow function.

import { STAGE_FILES_MAX, STAGE_NAMES_MAX } from "../limits.ts";
import {
  GONE,
  hash64,
  ledgerPath,
  madeBy,
  parseLedger,
  statusPaths,
} from "./ledger.ts";

/** The folder of the edit ledger: `$TMPDIR`, or `/tmp` when it is not set or empty, with no end slash. */
export const ledgerTmp = (tmp: string | undefined): string =>
  (tmp || "/tmp").replace(/(.)\/+$/, "$1");

/** The reads of `userEdits`. `git` runs `git -C <dir>` with the arguments. */
export type EditPorts = {
  git: (args: string[]) => Promise<{ exitCode: number; stdout: string }>;
  read: (path: string) => Promise<string>;
  exists: (path: string) => Promise<boolean>;
  tmp: () => Promise<string | undefined>;
  root: () => Promise<string>;
};

/** The changed files of the work tree that no line of the edit ledger holds with their hash now, relative to the root, or only the file `only` when given. A `git` run that fails gives none. */
export const userEdits = async (
  io: EditPorts,
  only?: string,
): Promise<string[]> => {
  const [status, top] = await Promise.all([
    io.git(["status", "--porcelain", "-z", "--untracked-files=all"]),
    io.git(["rev-parse", "--show-toplevel"]),
  ]);
  if (status.exitCode !== 0 || top.exitCode !== 0) return [];
  const root = top.stdout.trim();
  const changed = statusPaths(status.stdout)
    .filter((rel) => only === undefined || `${root}/${rel}` === only)
    .slice(0, STAGE_FILES_MAX);
  if (changed.length === 0) return [];
  const tmp = ledgerTmp(await io.tmp().catch(() => undefined));
  const file = ledgerPath(tmp, await io.root());
  const lines = parseLedger(
    ((await io.exists(file)) && (await io.read(file))) || "",
  );
  const found: string[] = [];
  for (const rel of changed) {
    const hash = await io.read(`${root}/${rel}`).then(hash64, () => GONE);
    if (hash !== GONE && madeBy(lines, `${root}/${rel}`, hash).length === 0)
      found.push(rel);
    if (found.length >= STAGE_NAMES_MAX) break;
  }
  return found;
};
