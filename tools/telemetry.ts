// The `claude` CLI as the scripts of `tools/` run it: `claude` with the env that stops its telemetry.
// The facts are from the bundle of Claude Code 2.1.301 (`external/cc-2.1.301/strings.txt`).
// `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` sets the traffic mode to `essential-traffic`.
// The Datadog event path (`http-intake.logs.us5.datadoghq.com`) sends only after `initializeDatadog`, which is false when the mode is not `default`.
// The error reporter returns when `DISABLE_ERROR_REPORTING` is set or the mode is `essential-traffic`.
// So `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` stops the event path, and `DISABLE_ERROR_REPORTING` stops the error path.
// A script runs its `claude` commands through `$claude()`, so no call of `tools/` leaves the vars out.

import { $ } from "bun";

/** The env that each `claude` call of `tools/` adds to the env of the process. */
export const CLAUDE_ENV: Readonly<Record<string, string>> = {
  CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
  DISABLE_ERROR_REPORTING: "1",
};

/**
 * The `Bun.$` shell that runs its commands with `CLAUDE_ENV`.
 * It reads `process.env` at each call, so a change of `HOME` or `CLAUDE_CONFIG_DIR` reaches the child.
 */
export const $claude = (): typeof $ => $.env({ ...process.env, ...CLAUDE_ENV });
