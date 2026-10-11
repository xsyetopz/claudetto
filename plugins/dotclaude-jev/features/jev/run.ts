// The Jev client as a child process.
// The client imports `node:` modules, which the graph of a hooks module cannot hold,
// so the module runs it through `$.process.run`.
// The `$` calls are in the hooks module, because `$` is not followed across an import.

import { CLIENT, JEV_TIMEOUT_MS } from "./limits.ts";

/** The argument vector of one client run. */
export const clientArgv = (root: string, args: string[]): string[] => [
  "bun",
  "--no-env-file",
  `${root}/${CLIENT}`,
  ...args,
];

/**
 * The init of `$.process.run`.
 * The key goes in the environment of the child, and never in the argument list.
 */
export function clientInit(key: string, stdin?: string) {
  return {
    env: { TYPESAFE_API_KEY: key },
    timeoutMs: JEV_TIMEOUT_MS,
    ...(stdin === undefined ? {} : { stdin }),
  };
}

/** The outcome of a run: `{ ok: true, stdout }` or `{ ok: false, reason }`. */
export type Outcome =
  | { ok: true; stdout: string }
  | { ok: false; reason: string };

/** The fields of a `$.process.run` result that the outcome reads. */
export interface ClientRun {
  exitCode: number | null;
  stdout: string;
  stderr: string;
}

/** The outcome of one client run, from `ClientRun`. */
export function outcome(run: ClientRun): Outcome {
  if (run.exitCode === 0) return { ok: true, stdout: run.stdout.trim() };
  return {
    ok: false,
    reason: run.stderr.trim() || `The client exited with code ${run.exitCode}.`,
  };
}
