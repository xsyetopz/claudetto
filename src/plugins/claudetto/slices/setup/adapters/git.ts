// The `git` calls of the CLI: one run of `git`, and the SSH signing key of the git config.

import { runProgram } from "../../../../../kernel/node/process.ts";
import { GIT_TIMEOUT_MS } from "../limits.ts";

/** The exit code and stdout of `git args` in `cwd` with `env`, or `undefined` when git is not found. */
export const git = (args: string[], cwd: string, env: NodeJS.ProcessEnv) => {
  try {
    const result = runProgram("git", args, {
      cwd,
      env,
      stdin: "ignore",
      stdout: "pipe",
      stderr: "ignore",
      timeout: GIT_TIMEOUT_MS,
    });
    return {
      code: result.exitCode,
      out: (result.stdout?.toString() ?? "").trim(),
    };
  } catch {
    return undefined;
  }
};

/**
 * The value of `git config user.signingkey` in `cwd`, or `undefined` when it is unset or git fails.
 * Git reads its config from `env`.
 */
export const signingKey = (
  cwd: string,
  env: NodeJS.ProcessEnv = process.env,
): string | undefined => {
  const found = git(["config", "--get", "user.signingkey"], cwd, env);
  return found?.code === 0 && found.out ? found.out : undefined;
};
