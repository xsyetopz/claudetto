// The `claude` CLI as the scripts of `tools/` run it: `claude` with the env that stops its telemetry.
// Each var is documented in `external/dossier/cc-2.1.296/env.md`.
// The offsets are bytes of `external/cc-2.1.296/strings.txt`.
// `FMt()` (byte 13082831) returns `essential-traffic` when `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` is set (byte 13082841).
// `At()` (byte 13083051) tests that mode. The error reporter at byte 13084960 checks it with `DISABLE_ERROR_REPORTING`,
// but that reporter dispatches to a local store, not to Datadog.
// The Datadog error path is `iDe()` (byte 20428914), which returns when `Nbs()` (byte 20400699) is false.
// `Nbs()` returns when `DISABLE_ERROR_REPORTING` is set (byte 20400729). `iDe()` calls `zfo()` (byte 20421487), which enqueues to the sender.
// The Datadog host is `http-intake.logs.us5.datadoghq.com` (byte 20403805).
// The event path is `uPt()` (byte 20417140), and it sends only after `initializeDatadog` (byte 20416050) is true.
// `initializeDatadog` is false when `Uy()` (byte 15227601) is true, and `Uy()` calls `MV()` (byte 13083100), which is `FMt() !== "default"`.
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
