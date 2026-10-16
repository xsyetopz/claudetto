// The `git` calls of the worktree hooks.

import { GIT_TIMEOUT_MS } from "../limits.ts";

/** The result of one `git` call. `ok` is true on exit 0. */
export type Git = { ok: boolean; out: string; err: string };

/** Runs `git` in `cwd`. A missing `git`, a timeout, or a non-zero exit gives `ok: false`. */
export const git = (cwd: string, args: string[], input?: string): Git => {
  try {
    const r = Bun.spawnSync(["git", ...args], {
      cwd,
      stdin: input === undefined ? "ignore" : Buffer.from(input),
      timeout: GIT_TIMEOUT_MS,
      maxBuffer: 256 * 1024 * 1024,
    });
    return {
      ok: r.exitCode === 0,
      out: r.stdout.toString(),
      err: r.stderr.toString(),
    };
  } catch (error) {
    return { ok: false, out: "", err: String(error) };
  }
};

/** The root of the main worktree of the repository that holds `cwd`, or `null` when `cwd` is in no repository. */
export const mainRoot = (cwd: string): string | null => {
  const r = git(cwd, [
    "rev-parse",
    "--path-format=absolute",
    "--git-common-dir",
  ]);
  const dir = r.out.trim();
  if (!r.ok || dir === "") return null;
  return dir.endsWith("/.git") ? dir.slice(0, -"/.git".length) : null;
};

/**
 * The files of `root` that `.worktreeinclude` names and that git ignores, relative to `root`.
 * `ls-files` lists the untracked files that the patterns match, and `check-ignore` keeps the ignored ones.
 */
export const includedFiles = (root: string, file: string): string[] => {
  const listed = git(root, [
    "ls-files",
    "-z",
    "--others",
    "--ignored",
    `--exclude-from=${file}`,
  ]);
  if (!listed.ok || listed.out === "") return [];
  const checked = git(root, ["check-ignore", "-z", "--stdin"], listed.out);
  return checked.out.split("\0").filter((e) => e !== "");
};
