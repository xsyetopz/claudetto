// The git state of the working folder.
// It is the one program that the status line runs, once, with a time limit and a short cache.

import { spawnSync } from "node:child_process";
import { cached } from "./cache.mjs";
import { GIT_TIMEOUT_MS } from "./limits.mjs";

/** The parts of `git status --porcelain=v2 -b` output: branch, changed files, and commits ahead and behind. */
export function parseStatus(text) {
  const out = { branch: null, dirty: 0, ahead: 0, behind: 0 };
  let oid = null;
  for (const line of text.split("\n")) {
    if (line.startsWith("# branch.head ")) out.branch = line.slice(14);
    else if (line.startsWith("# branch.oid ")) oid = line.slice(13, 20);
    else if (line.startsWith("# branch.ab ")) {
      const m = /\+(\d+) -(\d+)/.exec(line);
      if (m) [out.ahead, out.behind] = [Number(m[1]), Number(m[2])];
    } else if (line && !line.startsWith("#")) out.dirty++;
  }
  if (out.branch === "(detached)") out.branch = oid;
  return out.branch ? out : null;
}

/** The git state of `dir` (the cache in `cacheDir`, the temporary folder by default), or `null` when `git` fails, finds no repository, or does not answer in `timeout`. */
export function gitState(
  dir,
  now = Date.now(),
  timeout = GIT_TIMEOUT_MS,
  cacheDir,
) {
  return cached(
    `git ${dir}`,
    () => {
      const res = spawnSync(
        "git",
        ["--no-optional-locks", "-C", dir, "status", "--porcelain=v2", "-b"],
        { encoding: "utf8", timeout },
      );
      return res.status === 0 && res.stdout ? parseStatus(res.stdout) : null;
    },
    now,
    cacheDir,
  );
}
