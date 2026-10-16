// The cache of the git segment: the last `git status` result of each repository, in one file of a folder of this user.
// The folder is `claudetto-git-<uid>` in `os.tmpdir()`, and it is used only when only the user can write it.
// The status line runs every `REFRESH_SECONDS`, so the cache keeps the `git` call from running on each refresh.
// The file name holds a hash of the repository path, so the path itself is not in the temp folder.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { failureText } from "../../../../../kernel/node/hook-io.ts";
import type { FileReader, ProcessRunner } from "../../../../../kernel/ports.ts";
import { GIT_ARGS, parseStatus } from "../domain/git.ts";
import type { GitFault, GitState } from "../domain/types.ts";
import { GIT_CACHE_MS, GIT_TIMEOUT_MS } from "../limits.ts";

/** The ports of the cache. `Deps` of the CLI gives each of them. */
export interface GitPorts {
  readonly files: FileReader;
  readonly write: (file: string, text: string) => Promise<void>;
  readonly now: () => number;
  readonly runner: ProcessRunner;
  /** The environment of the CLI. The `git` call takes it, with the language set to `C`. */
  readonly env: Readonly<Record<string, string | undefined>>;
}

/** What the git segment shows: the state, `null` for a folder that is no repository, or the fault of a `git` call that failed. */
export type GitView = GitState | GitFault | null;

/** A saved result: the time in milliseconds, and the view that `git` gave then. */
interface Saved {
  readonly at: number;
  readonly state: GitView;
}

/**
 * The folder of the cache of this user in `root`: `claudetto-git-<uid>`, made with mode `0700` when it is missing.
 * It gives `null` when the folder exists with another owner, with group or other mode bits, or as a link.
 * With no user id (`null`), as on Windows, the folder is `claudetto-git`, because the temp folder there is a folder of this user, and mode bits do not apply.
 */
export const cacheFolderOf = (
  root: string,
  uid: number | null = process.getuid?.() ?? null,
): string | null => {
  const dir = path.join(
    root,
    uid === null ? "claudetto-git" : `claudetto-git-${uid}`,
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

/** The cache file of the repository at `dir`, in the cache folder of this user, or `null` when that folder is not safe to use. */
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
  return path.join(folder, `claudetto-git-${key}.jsonl`);
};

/** True for a count that `parseStatus` can give: a safe integer of zero or more. */
const isCount = (value: unknown): boolean =>
  Number.isSafeInteger(value) && (value as number) >= 0;

/** True for text of one line without a control character. */
const isPlain = (value: unknown): value is string =>
  typeof value === "string" &&
  value.length > 0 &&
  [...value].every((c) => c.charCodeAt(0) >= 0x20 && c.charCodeAt(0) !== 0x7f);

/** True for a view that `runGit` can give. */
const isView = (value: unknown): boolean => {
  if (value === null) return true;
  if (typeof value !== "object") return false;
  const view = value as Record<string, unknown>;
  if ("error" in view) return isPlain(view["error"]);
  return (
    isPlain(view["branch"]) &&
    isCount(view["dirty"]) &&
    isCount(view["ahead"]) &&
    isCount(view["behind"])
  );
};

/** The saved result in `text`, or `null` for a missing or damaged file. A torn write is a damaged file. */
const parseSaved = (text: string | null): Saved | null => {
  if (text === null) return null;
  try {
    const value = JSON.parse(text);
    const valid = typeof value?.at === "number" && isView(value.state);
    return valid ? (value as Saved) : null;
  } catch (err) {
    if (err instanceof SyntaxError) return null;
    throw err;
  }
};

/** The arguments that ask `git` for the git folder. It exits with 0 inside a repository, and with `NOT_A_REPOSITORY` outside. */
const REPOSITORY_ARGS = ["rev-parse", "--git-dir"] as const;

/** The exit code of `git` for a fatal error, such as a folder that is no repository. */
const NOT_A_REPOSITORY = 128;

/** The longest cause that the segment keeps, in characters. */
const CAUSE_MAX = 120;

/** `text` as one line without control characters, cut to `CAUSE_MAX`. */
const oneLine = (text: string): string =>
  [...(text.trim().split("\n")[0] ?? "")]
    .filter((c) => c.charCodeAt(0) >= 0x20 && c.charCodeAt(0) !== 0x7f)
    .join("")
    .slice(0, CAUSE_MAX);

/**
 * True when `git` finds a git folder from `dir`.
 * It reads the exit code and no message, so the language of `git` does not matter.
 * It runs only after `git status` failed with the fatal code, so a refresh with a cache or a good status adds no process.
 */
const isRepository = (dir: string, ports: GitPorts): boolean =>
  ports.runner.run("git", REPOSITORY_ARGS, {
    cwd: dir,
    timeout: GIT_TIMEOUT_MS,
    env: ports.env,
  }).exitCode === 0;

/**
 * The view of the git call in `dir`.
 * A folder that is no repository gives `null`.
 * A missing `git`, a timeout, a signal, and any other failure give the fault with its cause.
 */
const runGit = (dir: string, ports: GitPorts): GitView => {
  try {
    const result = ports.runner.run("git", GIT_ARGS, {
      cwd: dir,
      timeout: GIT_TIMEOUT_MS,
      env: ports.env,
    });
    if (result.timedOut)
      return { error: `git did not answer in ${GIT_TIMEOUT_MS} ms` };
    if (result.exitCode === 0) return parseStatus(result.stdout);
    if (result.exitCode === NOT_A_REPOSITORY && !isRepository(dir, ports))
      return null;
    const how =
      result.exitCode === null
        ? `ended by ${result.signal ?? "a signal"}`
        : `exited with ${result.exitCode}`;
    const why = oneLine(result.stderr);
    return { error: `git ${how}${why ? `: ${why}` : ""}` };
  } catch (err) {
    return {
      error:
        oneLine(err instanceof Error ? err.message : String(err)) ||
        "git did not run",
    };
  }
};

/** The saved result of `dir` when it is at least zero and less than `GIT_CACHE_MS` old at `now`. */
const freshOf = (saved: Saved | null, now: number): Saved | null => {
  if (!saved) return null;
  const age = now - saved.at;
  return age >= 0 && age < GIT_CACHE_MS ? saved : null;
};

/**
 * The view of the git state of `dir`.
 * A saved result that is still fresh is given with no `git` run.
 * Otherwise `git` runs, and its result is saved, a fault included, so a `git` that fails does not run again at each refresh.
 * A fault, a cache that cannot be read, and a failed write go to `onError`.
 * With no safe cache folder, `git` runs and nothing is read or written.
 */
export const cachedGitState = async (
  dir: string,
  ports: GitPorts,
  onError: (text: string) => void,
): Promise<GitView> => {
  const file = cacheFile(dir);
  const now = ports.now();
  let saved: Saved | null = null;
  if (file !== null) {
    try {
      saved = parseSaved(await ports.files.read(file));
    } catch (err) {
      onError(failureText(err));
    }
  }
  const fresh = freshOf(saved, now);
  if (fresh) return fresh.state;
  const view = runGit(dir, ports);
  if (view !== null && "error" in view) onError(`git: ${view.error}`);
  if (file !== null) {
    try {
      await ports.write(file, `${JSON.stringify({ at: now, state: view })}\n`);
    } catch (err) {
      onError(failureText(err));
    }
  }
  return view;
};
