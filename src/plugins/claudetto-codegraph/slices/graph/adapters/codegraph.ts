// The runner of the `codegraph` CLI for the check.
// It never runs `codegraph install` or `codegraph init`, because they change user files.

import { existsSync } from "node:fs";
import { join } from "node:path";
import { INDEX_PATH } from "../graph.ts";

/** True when the project has an index. The home folder has a `.codegraph/` for telemetry, with no database. */
export const indexed = (root: string): boolean =>
  existsSync(join(root, INDEX_PATH));

/** A run that ended: the exit code, or `null` for a timeout, and the text of stdout and stderr. `error` is set when the program did not start. */
interface Ran {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  error?: NodeJS.ErrnoException;
}

/** The result of a `codegraph` call. `ok` is false for a missing CLI (`error.code` is `ENOENT`), a timeout (`exitCode` is `null`), and a non-zero exit. */
export interface Result {
  ok: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  error?: NodeJS.ErrnoException;
}

/** Runs `argv` in `cwd` and waits for it. A program that is not on `PATH` gives `error` with `code` `ENOENT`, as in `spawnSync`. */
const runSync = (
  argv: string[],
  {
    cwd,
    env,
    timeout,
  }: { cwd: string; env: NodeJS.ProcessEnv; timeout: number },
): Ran => {
  try {
    const r = Bun.spawnSync({
      cmd: argv,
      cwd,
      env,
      stdin: "ignore",
      stdout: "pipe",
      stderr: "pipe",
      timeout,
    });
    // A run that the time limit ended has a signal and no exit code of its own.
    return {
      exitCode: r.signalCode ? null : r.exitCode,
      stdout: r.stdout.toString(),
      stderr: r.stderr.toString(),
    };
  } catch (error) {
    return {
      exitCode: null,
      stdout: "",
      stderr: "",
      error: error as NodeJS.ErrnoException,
    };
  }
};

/** Runs `codegraph` with `args` in `root`. A missing CLI, a timeout, and a non-zero exit give `ok: false`, and the fields tell them apart. */
export const codegraph = (
  args: string[],
  {
    root,
    env,
    timeout,
  }: { root: string; env: NodeJS.ProcessEnv; timeout: number },
): Result => {
  const r = runSync(["codegraph", ...args], { cwd: root, env, timeout });
  return {
    ok: !r.error && r.exitCode === 0,
    stdout: r.stdout,
    stderr: r.stderr,
    exitCode: r.exitCode,
    ...(r.error ? { error: r.error } : {}),
  };
};
