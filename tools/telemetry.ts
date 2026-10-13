// The `claude` CLI as the scripts of `tools/` run it: `claude` with the env that stops its telemetry.
// `FMt()` in the bundle returns `essential-traffic` when `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` is set
// (`external/cc-2.1.296/strings.txt`, byte 13082831).
// `At()` tests that mode (byte 13083051), and the error reporter returns early when `At()` is true
// (byte 13085285). The reporter posts to `http-intake.logs.us5.datadoghq.com`
// (`external/cc-2.1.296/strings.txt`, byte 20403775).
// `external/dossier/cc-2.1.296/env.md` lists it as a documented variable.
// A script runs its `claude` commands through `$claude`, so no call of `tools/` leaves the variable out.

import { $ } from "bun";

/** The env that each `claude` call of `tools/` adds to the env of the process. */
export const CLAUDE_ENV: Readonly<Record<string, string>> = {
  CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
};

/** The `Bun.$` shell that runs its commands with `CLAUDE_ENV`. */
export const $claude = $.env({ ...process.env, ...CLAUDE_ENV });
