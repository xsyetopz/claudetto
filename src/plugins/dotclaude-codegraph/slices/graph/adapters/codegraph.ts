// The runner of the `codegraph` CLI for the hook and the check. It runs on Bun, so no mod handler imports it.
// It never runs `codegraph install` or `codegraph init`, because they change user files.

import { existsSync, statSync } from "node:fs";
import { delimiter, join } from "node:path";
import { type HookPayload, INDEX_PATH } from "../domain/graph.ts";
import { TREE_GRACE_MS } from "../limits.ts";

const TREE = join(import.meta.dirname, "run-tree.ts");
// On Windows npm installs `codegraph` as `codegraph.cmd`, and Node runs a `.cmd` file only through a shell.
// A shell reads the arguments as text, so an argument with a character outside this set is not run.
const SHELL_SAFE_ARG = /^[\w$.-]+$/;

/** The project folder of a hook payload. */
export const rootOf = (
  payload: HookPayload | undefined,
  env: NodeJS.ProcessEnv,
): string => env["CLAUDE_PROJECT_DIR"] || payload?.cwd || process.cwd();

/** True when the project has an index. The home folder has a `.codegraph/` for telemetry, with no database. */
export const indexed = (root: string): boolean =>
  existsSync(join(root, INDEX_PATH));

/**
 * The first file `name` + an extension of `PATHEXT` in a folder of `env.PATH`, or undefined.
 * A shell that runs `codegraph.cmd` gives exit status 1 for a missing program and no `ENOENT`, so Windows looks first.
 */
export const findOnPath = (
  name: string,
  env: NodeJS.ProcessEnv,
): string | undefined => {
  const key = Object.keys(env).find((k) => k.toUpperCase() === "PATH");
  const exts = (env["PATHEXT"] || ".EXE;.CMD;.BAT").split(";");
  const path = key === undefined ? undefined : env[key];
  for (const dir of (path ?? "").split(delimiter))
    for (const ext of exts) {
      const file = join(dir, name + ext);
      if (existsSync(file) && statSync(file).isFile()) return file;
    }
  return undefined;
};

/** A run that ended: the exit code, or `null` for a timeout, and the text of stdout. `error` is set when the program did not start. */
interface Ran {
  exitCode: number | null;
  stdout: string;
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
      stderr: "ignore",
      timeout,
    });
    return { exitCode: r.exitCode, stdout: r.stdout.toString() };
  } catch (error) {
    return {
      exitCode: null,
      stdout: "",
      error: error as NodeJS.ErrnoException,
    };
  }
};

/** Runs `codegraph` with `args` in `root`, and gives `{ ok, stdout }`. A missing CLI, a timeout, and a non-zero exit give `ok: false`. */
export const codegraph = (
  args: string[],
  {
    root,
    env,
    timeout,
  }: { root: string; env: NodeJS.ProcessEnv; timeout: number },
): { ok: boolean; stdout: string; error?: NodeJS.ErrnoException } => {
  const shell = process.platform === "win32";
  if (shell && !findOnPath("codegraph", env))
    return {
      ok: false,
      stdout: "",
      error: Object.assign(new Error("codegraph is not on PATH"), {
        code: "ENOENT",
      }),
    };
  if (shell && !args.every((arg) => SHELL_SAFE_ARG.test(arg)))
    return { ok: false, stdout: "", error: new Error("unsafe argument") };
  // Windows runs the command in `run-tree.ts`, which ends the process tree at the time limit.
  // The `timeout` of this call is a later back stop.
  const r = shell
    ? runSync(
        [
          process.execPath,
          "--no-env-file",
          TREE,
          String(timeout),
          "codegraph",
          ...args,
        ],
        { cwd: root, env, timeout: timeout + TREE_GRACE_MS },
      )
    : runSync(["codegraph", ...args], { cwd: root, env, timeout });
  return {
    ok: !r.error && r.exitCode === 0,
    stdout: r.stdout,
    ...(r.error ? { error: r.error } : {}),
  };
};
