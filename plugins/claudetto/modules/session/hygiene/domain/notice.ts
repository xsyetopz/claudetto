// The notice of the cleanup (spec `session-hygiene`, "Notices Report a Change"): only what was removed, with counts that agree with their nouns.

import { CLEANED } from "../prompts.ts";

interface Removed {
  readonly folders: number;
  readonly files: number;
  readonly worktrees: number;
  readonly probes: number;
  readonly bytes: number;
}

const UNITS = ["B", "KB", "MB", "GB"];

/** The size with a unit of 1,024 steps and at most one decimal, such as `2 MB`. */
export const sizeOf = (bytes: number): string => {
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < UNITS.length - 1) {
    size /= 1024;
    unit++;
  }
  return `${Math.round(size * 10) / 10} ${UNITS[unit]}`;
};

const PROBE = "leftover `fswatch-probe-*` folder";
const ISSUE = " of Claude Code (anthropics/claude-code#104170)";

/** The notice for what was removed, or `null` when nothing was removed. */
export const removedNotice = (removed: Removed): string | null => {
  const parts = (
    [
      [removed.folders, "folder"],
      [removed.files, "file"],
      [removed.worktrees, "worktree"],
      [removed.probes, PROBE],
    ] as const
  )
    .filter(([n]) => n > 0)
    .map(
      ([n, noun]) =>
        `${n} ${noun}${n === 1 ? "" : "s"}${noun === PROBE ? ISSUE : ""}`,
    );
  if (parts.length === 0) return null;
  return CLEANED({
    list: parts.join(", "),
    size: removed.bytes > 0 ? ` of ${sizeOf(removed.bytes)}` : "",
  });
};
