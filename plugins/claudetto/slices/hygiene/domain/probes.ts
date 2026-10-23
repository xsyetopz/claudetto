// The workaround for anthropics/claude-code#104170: the settings watcher of Claude Code leaves `fswatch-probe-*` folders in its temp folder.
// Remove this file, its hook, and its tests when the fix is in the lowest version that claudetto supports.
// The temp folder of Claude Code is `<CLAUDE_CODE_TMPDIR or /tmp>/claude-<uid>` (`Fm` and `ior` in the strings of 2.1.307), and the sweep looks in each folder of `kernel/tmp.ts`.

import { PROBE_MAX_AGE_MIN } from "../limits.ts";

/** The argv that removes each probe folder older than `PROBE_MAX_AGE_MIN` under `base`, and prints each one. */
export const sweepArgv = (base: string): string[] => [
  "sh",
  "-c",
  `exec find "$1/claude-$(id -u)" -maxdepth 1 -type d -name 'fswatch-probe-*' -mmin +${PROBE_MAX_AGE_MIN} -print -exec rm -rf {} +`,
  "sh",
  base.replace(/\/+$/, "") || "/",
];

export const removedCount = (stdout: string): number =>
  stdout.split("\n").filter(Boolean).length;
