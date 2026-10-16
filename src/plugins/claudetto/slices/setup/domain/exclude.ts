// The runtime paths of `.claude/` and `.claudetto/` that git must not track, and the lines that keep them out of git.
// The lines go to `.git/info/exclude`, so the project `.gitignore` stays as it is.

import { GIT_EXCLUDE_PATTERNS } from "../../../../../kernel/paths.ts";

/** The comment line above the lines that setup adds. */
export const EXCLUDE_HEADER = "# claudetto-runtime";

/** The patterns of the runtime paths. Claude Code writes most of the `.claude/` ones itself, and `.claudetto/handoffs/` holds local files of claudetto. */
export const RUNTIME_PATTERNS = GIT_EXCLUDE_PATTERNS;

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
