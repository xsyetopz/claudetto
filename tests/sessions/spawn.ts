// Runs a bin of `dotclaude-sessions` in a child Bun process, for the tests of the bins.

import type { Env } from "../support/repo.ts";

/**
 * Runs `script` with `args` in Bun, with `--no-env-file` first, and returns the exit `status`
 * and the text of `stdout` and `stderr`.
 */
export function runBin(script: string, args: string[], env: Env = process.env) {
  const out = Bun.spawnSync(
    [process.execPath, "--no-env-file", script, ...args],
    {
      env,
    },
  );
  return {
    status: out.exitCode,
    stdout: out.stdout.toString(),
    stderr: out.stderr.toString(),
  };
}
