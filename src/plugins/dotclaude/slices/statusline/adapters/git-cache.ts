// The cache of the git segment: the last `git status` result of each repository, in one file of a folder of this user.
// The folder is `dotclaude-git-<uid>` in `os.tmpdir()`, and it is used only when only the user can write it.
// The status line runs every `REFRESH_SECONDS`, so the cache keeps the `git` call from running on each refresh.
// The file name holds a hash of the repository path, so the path itself is not in the temp folder.

import fs from "node:fs";
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

/**
 * The folder of the cache of this user in `root`: `dotclaude-git-<uid>`, made with mode `0700` when it is missing.
 * It gives null when the folder exists with another owner, with group or other mode bits, or as a link.
 * With no user id (`null`), as on Windows, the folder is `dotclaude-git`, because the temp folder there is a folder of this user, and mode bits do not apply.
 */
export const cacheFolderOf = (
  root: string,
  uid: number | null = process.getuid?.() ?? null,
): string | null => {
  const dir = path.join(
    root,
    uid === null ? "dotclaude-git" : `dotclaude-git-${uid}`,
  );
  try {
    fs.mkdirSync(dir, { mode: 0o700 });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "EEXIST") return null;
  }
  try {
    const stat = fs.lstatSync(dir);
    const own =
      stat.isDirectory() &&
      (uid === null || (stat.uid === uid && (stat.mode & 0o077) === 0));
    return own ? dir : null;
  } catch {
    return null;
  }
};

/** The cache file of the repository at `dir`, in the cache folder of this user, or null when that folder is not safe to use. */
export const cacheFile = (
  dir: string,
  root: string = os.tmpdir(),
  uid: number | null = process.getuid?.() ?? null,
): string | null => {
  const folder = cacheFolderOf(root, uid);
  if (folder === null) return null;
  const key = new Bun.CryptoHasher("sha256")
    .update(dir)
    .digest("hex")
    .slice(0, 16);
  return path.join(folder, `dotclaude-git-${key}.json`);
};

/** True for a count that `parseStatus` can give: a safe integer of zero or more. */
const isCount = (value: unknown): boolean =>
  Number.isSafeInteger(value) && (value as number) >= 0;

/** True for a branch name without a control character, such as the escape code of a terminal. */
const isBranch = (value: unknown): boolean =>
  typeof value === "string" &&
  value.length > 0 &&
  [...value].every((c) => c.charCodeAt(0) >= 0x20 && c.charCodeAt(0) !== 0x7f);

/** True for a state that `parseStatus` can give, or null for a failed `git` run. */
const isState = (value: unknown): boolean => {
  if (value === null) return true;
  if (typeof value !== "object") return false;
  const state = value as Record<keyof GitState, unknown>;
  return (
    isBranch(state.branch) &&
    isCount(state.dirty) &&
    isCount(state.ahead) &&
    isCount(state.behind)
  );
};

/** The saved result in `text`, or null for a missing or damaged file. */
const parseSaved = (text: string | null): Saved | null => {
  if (text === null) return null;
  try {
    const value = JSON.parse(text);
    const valid = typeof value?.at === "number" && isState(value.state);
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

/** The git state of `dir`. A saved result that is still fresh is given with no `git` run. Otherwise `git` runs, and its result is saved. A cache that cannot be read or written does not stop the status line, and a failed write goes to `onError`. With no safe cache folder, `git` runs and nothing is read or written. */
export const cachedGitState = async (
  dir: string,
  ports: GitPorts,
  onError: (text: string) => void,
): Promise<GitState | null> => {
  const file = cacheFile(dir);
  if (file === null) return runGit(dir, ports.runner);
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
