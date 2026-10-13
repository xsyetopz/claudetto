// The cache of the git segment: the last `git status` result of each repository, in one file of `os.tmpdir()`.
// The status line runs every `REFRESH_SECONDS`, so the cache keeps the `git` call from running on each refresh.
// The file name holds a hash of the repository path, so the path itself is not in the temp folder.

import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { failureText } from "../../../../../kernel/node/hook-io.ts";
import type { FileReader, ProcessRunner } from "../../../../../kernel/ports.ts";
import { GIT_ARGS, parseStatus } from "../domain/git.ts";
import type { GitState } from "../domain/types.ts";
import { GIT_CACHE_MS, GIT_TIMEOUT_MS } from "../limits.ts";

/** The ports of the cache. `Deps` of the CLI gives each of them. */
export interface GitPorts {
  readonly files: FileReader;
  readonly write: (file: string, text: string) => Promise<void>;
  readonly now: () => number;
  readonly runner: ProcessRunner;
}

/** A saved result: the time in milliseconds, and the state that `git` gave then. */
interface Saved {
  readonly at: number;
  readonly state: GitState | null;
}

/** The cache file of the repository at `dir`. */
export const cacheFile = (dir: string): string => {
  const key = createHash("sha256").update(dir).digest("hex").slice(0, 16);
  return path.join(os.tmpdir(), `dotclaude-git-${key}.json`);
};

/** The saved result in `text`, or null for a missing or damaged file. */
const parseSaved = (text: string | null): Saved | null => {
  if (text === null) return null;
  try {
    const value = JSON.parse(text);
    const valid =
      typeof value?.at === "number" &&
      (value.state === null || typeof value.state === "object");
    return valid ? (value as Saved) : null;
  } catch {
    return null;
  }
};

/** The git state of `dir`, or null when `git` is missing, fails, finds no repository, or does not answer in time. */
const runGit = (dir: string, runner: ProcessRunner): GitState | null => {
  try {
    const result = runner.run("git", GIT_ARGS, {
      cwd: dir,
      timeout: GIT_TIMEOUT_MS,
    });
    return result.exitCode === 0 ? parseStatus(result.stdout) : null;
  } catch {
    return null;
  }
};

/** The saved result of `dir` when it is at least zero and less than `GIT_CACHE_MS` old at `now`. */
const freshOf = (saved: Saved | null, now: number): Saved | null => {
  if (!saved) return null;
  const age = now - saved.at;
  return age >= 0 && age < GIT_CACHE_MS ? saved : null;
};

/** The git state of `dir`. A saved result that is still fresh is given with no `git` run. Otherwise `git` runs, and its result is saved. A cache that cannot be read or written does not stop the status line, and a failed write goes to `onError`. */
export const cachedGitState = async (
  dir: string,
  ports: GitPorts,
  onError: (text: string) => void,
): Promise<GitState | null> => {
  const file = cacheFile(dir);
  const now = ports.now();
  const read = await ports.files.read(file).catch(() => null);
  const fresh = freshOf(parseSaved(read), now);
  if (fresh) return fresh.state;
  const state = runGit(dir, ports.runner);
  try {
    await ports.write(file, JSON.stringify({ at: now, state }));
  } catch (err) {
    onError(failureText(err));
  }
  return state;
};
