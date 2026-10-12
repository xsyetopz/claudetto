// The sources of context at the start of a session that `trim` counts.
// A source with a switch in `removed.ts` is one that `trim` turns off.
// The other sources stay on, and the user controls them.

import {
  type MemoryFile,
  startRules,
  startRuleTokens,
} from "../../../../../kernel/rules.ts";

/** One source of context at the start of a session. */
export interface ContextSource {
  readonly source: string;
  /** How the user lowers the cost of the source. */
  readonly control: string;
}

/** The sources of context at the start of a session that hold files of the project. */
export const CONTEXT_SOURCES: readonly ContextSource[] = [
  {
    source: "`CLAUDE.md` files",
    control: "`claudeMdExcludes`, and `CLAUDE_CODE_DISABLE_CLAUDE_MDS`.",
  },
  {
    source: "Rules with no `paths` in `.claude/rules/`",
    control:
      "Add `paths` to the rule, or exclude the file with `claudeMdExcludes`.",
  },
  {
    source: "Auto memory",
    control: "`autoMemoryEnabled`, which `trim` sets to `false`.",
  },
];

/** The rules that load at the start, and their tokens, from the memory files of the context breakdown. */
export const rulesAtStart = (
  files: readonly MemoryFile[] = [],
): { files: MemoryFile[]; tokens: number } => ({
  files: startRules(files),
  tokens: startRuleTokens(files),
});
