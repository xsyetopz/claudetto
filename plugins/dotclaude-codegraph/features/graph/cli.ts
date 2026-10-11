// The classic command hooks of the add-on, and the check, through the `codegraph` CLI.
//
//   node cli.ts session-start   SessionStart: sync the index, and add one line about the graph
//   node cli.ts sync            PostToolUse: sync the index after an edit or a git change (async hook)
//   node cli.ts check           print whether `codegraph` is on `PATH` and whether the project has an index
//
// Each hook runs only in a project with `.codegraph/codegraph.db`, and else it prints nothing.
// Each hook fails open: on an error or a timeout it adds nothing and never blocks a call.
// A payload that is not JSON is ignored, and any other error is written to stderr, with exit code 0.
// The add-on never runs `codegraph install` or `codegraph init`, because they change user files.

import { existsSync, statSync } from "node:fs";
import { delimiter, join } from "node:path";
import {
  BACKGROUND_SYNC_TIMEOUT_MS,
  QUERY_TIMEOUT_MS,
  START_SYNC_TIMEOUT_MS,
} from "./limits.ts";
import type { HookPayload } from "./rules.ts";
import { checkLines, parseJson, SESSION_LINE } from "./rules.ts";

/** The project folder of a hook payload. */
export const rootOf = (
  payload: HookPayload | undefined,
  env: NodeJS.ProcessEnv,
): string => env["CLAUDE_PROJECT_DIR"] || payload?.cwd || process.cwd();

/** True when the project has an index. The home folder has a `.codegraph/` for telemetry, with no database. */
export const indexed = (root: string): boolean =>
  existsSync(join(root, ".codegraph", "codegraph.db"));

const TREE = join(import.meta.dirname, "run-tree.ts");
// The time that `run-tree.ts` gets to start and to end the tree after the limit.
const TREE_GRACE_MS = 3000;
// On Windows npm installs `codegraph` as `codegraph.cmd`, and Node runs a `.cmd` file only through a shell.
// A shell reads the arguments as text, so an argument with a character outside this set is not run.
const SHELL_SAFE_ARG = /^[\w$.-]+$/;

/**
 * The first file `name` + an extension of `PATHEXT` in a folder of `env.PATH`, or undefined.
 * A shell that runs `codegraph.cmd` gives exit status 1 for a missing program and no `ENOENT`, so Windows looks first.
 */
export function findOnPath(
  name: string,
  env: NodeJS.ProcessEnv,
): string | undefined {
  const key = Object.keys(env).find((k) => k.toUpperCase() === "PATH");
  const exts = (env["PATHEXT"] || ".EXE;.CMD;.BAT").split(";");
  const path = key === undefined ? undefined : env[key];
  for (const dir of (path ?? "").split(delimiter))
    for (const ext of exts) {
      const file = join(dir, name + ext);
      if (existsSync(file) && statSync(file).isFile()) return file;
    }
  return undefined;
}

/** A run that ended: the exit code, or `null` for a timeout, and the text of stdout. `error` is set when the program did not start. */
interface Ran {
  exitCode: number | null;
  stdout: string;
  error?: NodeJS.ErrnoException;
}

/** Runs `argv` in `cwd` and waits for it. A program that is not on `PATH` gives `error` with `code` `ENOENT`, as in `spawnSync`. */
function runSync(
  argv: string[],
  {
    cwd,
    env,
    timeout,
  }: { cwd: string; env: NodeJS.ProcessEnv; timeout: number },
): Ran {
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
}

/** Runs `codegraph` with `args` in `root`, and gives `{ ok, stdout }`. A missing CLI, a timeout, and a non-zero exit give `ok: false`. */
function codegraph(
  args: string[],
  {
    root,
    env,
    timeout,
  }: { root: string; env: NodeJS.ProcessEnv; timeout: number },
): { ok: boolean; stdout: string; error?: NodeJS.ErrnoException } {
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
}

const context = (hookEventName: string, additionalContext: string) => ({
  hookSpecificOutput: { hookEventName, additionalContext },
});

/** The `SessionStart` output: sync the index, then add the line. Nothing when the project has no index or the CLI is missing. */
export function sessionStart(
  payload: HookPayload | undefined,
  env: NodeJS.ProcessEnv,
) {
  const root = rootOf(payload, env);
  if (!indexed(root)) return undefined;
  const sync = codegraph(["sync", "-q"], {
    root,
    env,
    timeout: START_SYNC_TIMEOUT_MS,
  });
  if (sync.error?.code === "ENOENT") return undefined;
  return context("SessionStart", SESSION_LINE);
}

/** Syncs the index. The hook is async, so the wait does not delay the session. */
export function sync(payload: HookPayload | undefined, env: NodeJS.ProcessEnv) {
  const root = rootOf(payload, env);
  if (indexed(root))
    codegraph(["sync", "-q"], {
      root,
      env,
      timeout: BACKGROUND_SYNC_TIMEOUT_MS,
    });
}

/** The lines of the check for `root`. */
export function check(root: string, env: NodeJS.ProcessEnv) {
  const version = codegraph(["--version"], {
    root,
    env,
    timeout: QUERY_TIMEOUT_MS,
  });
  return checkLines(version.ok, version.stdout.trim(), indexed(root));
}

const HOOKS: Record<string, typeof sessionStart | undefined> = {
  "session-start": sessionStart,
};

if (import.meta.main) {
  const mode = process.argv[2] ?? "";
  try {
    if (mode === "check") {
      console.log(check(process.cwd(), process.env).join("\n"));
    } else {
      const payload = parseJson(await Bun.stdin.text());
      if (payload === null) process.exit(0);
      if (mode === "sync") sync(payload, process.env);
      else {
        const out = HOOKS[mode]?.(payload, process.env);
        if (out) process.stdout.write(JSON.stringify(out));
      }
    }
  } catch (err) {
    process.stderr.write(
      `dotclaude-codegraph hook failed: ${(err as { stack?: string } | undefined)?.stack ?? err}\n`,
    );
  }
}
