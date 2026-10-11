// The git state of the working folder.
// It is the one program that the status line runs, once, with a time limit and no cache file.

import { spawnSync } from "node:child_process";
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

/**
 * The git state of `dir`, or `null` when `git` fails, finds no repository, or does not answer in `timeout`.
 * `run` takes the place of `spawnSync`, so a test can give the result of a call that timed out with no wait.
 */
export function gitState(dir, timeout = GIT_TIMEOUT_MS, run = spawnSync) {
  const res = run(
    "git",
    ["--no-optional-locks", "-C", dir, "status", "--porcelain=v2", "-b"],
    { encoding: "utf8", timeout },
  );
  return res.status === 0 && res.stdout ? parseStatus(res.stdout) : null;
}
