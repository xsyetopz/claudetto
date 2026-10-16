// The bounds of the `worktree` slice.

/** How long one `git` command of a worktree hook may run, in milliseconds. */
export const GIT_TIMEOUT_MS = 30_000;

/** The hook timeout of `WorktreeCreate` and `WorktreeRemove`, in seconds, as `slice.ts` gives it to Claude Code. */
export const HOOK_TIMEOUT_S = 120;
