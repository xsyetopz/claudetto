// The built-in parts that claudetto removes, each with the env and settings entries that turn it off.
// `slice.ts` builds the settings of the `trim` slice from this list, so each entry here ships.
// Each part was checked against Claude Code 2.1.301 (`external/cc-2.1.299/scratch/v110/trim-301.md`):
// the first request loses the text of the part, or the bundle line in `bundle` reads the switch.
// A part is here only when no slice of claudetto uses it, and its switch changes the request.
// A switch that equals the default of Claude Code has no entry (`tests/support/defaults.ts`).
// `CLAUDE_CODE_DISABLE_CFC_PROMPT` has no entry, because Claude in Chrome is off until the user turns it on,
// and then the switch removes the guidance that its tools need.
// The mode note of `WebSearch` has no entry, because `CLAUDE_CODE_REMOVE_PROMPT_STRINGS` does not reach it:
// Claude Code adds the note as its own system block (`M2n`, strings.txt:24545604),
// and only `CLAUDE_CODE_WEB_SEARCH_FAST_ARG`, which the docs do not name, removes it with the `mode` parameter.
// `disableAgentView` has no entry, because it turns off the agent view and the daemon, and it does not change the request.

/** One built-in part that claudetto removes, with the entries that turn it off. */
export interface RemovedPart {
  readonly part: string;
  readonly env?: Readonly<Record<string, string>>;
  readonly settings?: Readonly<Record<string, boolean>>;
  readonly reason: string;
  /** The line of `strings.txt` of 2.1.301 that reads the switch, when the docs do not name it. */
  readonly bundle?: string;
}

/** The built-in parts that the `trim` slice turns off. */
export const REMOVED_PARTS: readonly RemovedPart[] = [
  {
    part: "Cron tools",
    env: { CLAUDE_CODE_DISABLE_CRON: "1" },
    reason: "No slice of claudetto schedules a task.",
  },
  {
    part: "Explore and Plan agents",
    env: { CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS: "1" },
    reason: "The role agents of claudetto replace them.",
  },
  {
    part: "Fast mode text",
    env: { CLAUDE_CODE_DISABLE_FAST_MODE: "1" },
    reason: "No slice of claudetto switches the model to fast mode.",
  },
  {
    part: "Commit and PR workflow instructions",
    settings: { includeGitInstructions: false },
    reason:
      // biome-ignore lint/plugin: a developer note that never prints
      "The `attribution` and `sembr` slices and the guard give the git rules of claudetto.",
  },
  {
    part: "Auto memory",
    settings: { autoMemoryEnabled: false },
    reason: "No slice of claudetto reads or writes the auto memory.",
  },
  {
    part: "Claude.ai connectors",
    settings: { disableClaudeAiConnectors: true },
    reason: "No slice of claudetto uses a claude.ai connector.",
  },
  {
    part: "Claude.ai skills and plugins sync",
    settings: { syncClaudeAiSkills: false, syncClaudeAiPlugins: false },
    reason:
      // biome-ignore lint/plugin: a developer note that never prints
      "Synced skills and plugins add entries to the listings of each session.",
  },
];

/** The env and settings entries of `parts`, in one settings object. */
export const trimSettings = (
  parts: readonly RemovedPart[] = REMOVED_PARTS,
) => ({
  env: Object.assign({}, ...parts.map((p) => p.env ?? {})) as Record<
    string,
    string
  >,
  ...(Object.assign({}, ...parts.map((p) => p.settings ?? {})) as Record<
    string,
    boolean
  >),
});
