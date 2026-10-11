// The git state of the working folder.
// It is the one program that the status line runs, once, with a time limit and no cache file.

import { GIT_TIMEOUT_MS } from "./limits.ts";
import type { GitState } from "./types.ts";

/** The result of a `Bun.spawnSync` call, with the stdout of the program as bytes. */
type GitResult = { exitCode: number | null; stdout?: Buffer };

/** A program runner, as `spawnGit` is. It gives `null` when the program is missing. */
type GitRunner = (
  file: string,
  args: string[],
  options: { timeout: number },
) => GitResult | null;

/** Runs `file` with `args` in `options`, and gives its result, or `null` when `file` is missing. */
const spawnGit: GitRunner = (file, args, options) => {
  try {
    return Bun.spawnSync([file, ...args], {
      ...options,
      stdin: "ignore",
      stdout: "pipe",
      stderr: "ignore",
    });
  } catch {
    return null;
  }
};

/** The parts of `git status --porcelain=v2 -b` output: branch, changed files, and commits ahead and behind. */
export function parseStatus(text: string): GitState | null {
  const out: GitState = { branch: null, dirty: 0, ahead: 0, behind: 0 };
  let oid: string | null = null;
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
 * `run` takes the place of `spawnGit`, so a test can give the result of a call that timed out with no wait.
 */
export function gitState(
  dir: string,
  timeout = GIT_TIMEOUT_MS,
  run: GitRunner = spawnGit,
): GitState | null {
  const res = run(
    "git",
    ["--no-optional-locks", "-C", dir, "status", "--porcelain=v2", "-b"],
    { timeout },
  );
  return res?.exitCode === 0 && res.stdout
    ? parseStatus(res.stdout.toString())
    : null;
}
