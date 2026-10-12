// The runtime paths of `.claude/` that Claude Code writes in a project, and the lines that keep them out of git.
// The lines go to `.git/info/exclude`, so the project `.gitignore` stays as it is.

/** The comment line above the lines that setup adds. */
export const EXCLUDE_HEADER = "# dotclaude-runtime";

/** The patterns of the runtime paths. Claude Code 2.1.296 writes the first 10 itself, and `settings.local.json` is a local file. */
export const RUNTIME_PATTERNS = [
  "**/.claude/scheduled_tasks.lock",
  "**/.claude/scheduled_tasks.json",
  "**/.claude/routines/.state/",
  "**/.claude/worktrees/",
  "**/.claude/checkpoints/",
  "**/.claude/mailbox/",
  "**/.claude/agent-registry.json",
  "**/.claude/agent-memory-local",
  "**/.claude/first-run",
  "**/.claude/assistant-daemon-state.json",
  "**/.claude/settings.local.json",
] as const;

/** The path of a pattern that `git check-ignore` can test: the pattern without its `**` and `/` start. */
export const samplePath = (pattern: string): string =>
  pattern.replace(/^\*\*\//, "");

/**
 * The lines to append to `.git/info/exclude`, or `[]` when nothing is missing.
 * `excludeText` is the text of the file now.
 * `ignored` holds the patterns of `RUNTIME_PATTERNS` that git already ignores by any rule.
 * A pattern that has its own line in `excludeText` is skipped too.
 */
export const excludeLines = (
  excludeText: string,
  ignored: readonly string[],
): string[] => {
  const present = new Set(excludeText.split(/\r?\n/).map((l) => l.trim()));
  const missing = RUNTIME_PATTERNS.filter(
    (pattern) => !present.has(pattern) && !ignored.includes(pattern),
  );
  if (missing.length === 0) return [];
  return present.has(EXCLUDE_HEADER)
    ? [...missing]
    : [EXCLUDE_HEADER, ...missing];
};
