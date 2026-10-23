// Runs a program that npm or an installer put on `PATH`.

import type { ProcessRunner } from "../ports.ts";

/** The `ProcessRunner` of Bun. `Bun.spawnSync` throws when the program is missing, so a caller catches that. */
export const processRunner: ProcessRunner = {
  run: (file, args, options = {}) => {
    const result = Bun.spawnSync([file, ...args], {
      ...options,
      stdout: "pipe",
      stderr: "pipe",
    });
    return {
      exitCode: result.exitCode,
      stdout: result.stdout?.toString() ?? "",
      stderr: result.stderr?.toString() ?? "",
      ...(result.signalCode ? { signal: String(result.signalCode) } : {}),
      timedOut: result.exitedDueToTimeout === true,
    };
  },
};
