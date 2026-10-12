// The bounds of the `handoff` slice, in one place.
// Tests pin the table of `maxTurns` to the agent files, so change a bound here and nowhere else.

/**
 * The context of a subagent in tokens, from which the `tool.call` hook tells it to report now.
 * The investigator runs of `research/subagent-usage.md` ended at 110K to 223K tokens.
 */
export const SUBAGENT_CONTEXT_MAX = 100_000;

/**
 * The context of a Haiku 5.5 subagent in tokens, from which the hook tells it to report.
 * Haiku 5.5 costs 5x for each request above 100K prompt tokens, so the bound leaves room for the report turn below that step.
 */
export const HAIKU_CONTEXT_MAX = 85_000;

/**
 * The turns left of a subagent, at which the hook tells it to report now.
 * With 2 turns left the next turn is the report and the last turn is spare.
 * It must stay below the smallest `maxTurns` of the agent files.
 */
export const TURNS_LEFT_AT = 2;

/** The most words in the final report of an agent. The main session keeps each report to the end. */
export const REPORT_MAX_WORDS = 400;

/** The share of the context window in percent, at which the main session starts a handoff. */
export const CONTEXT_PERCENT = 60;

/**
 * The turns of the main session that a started handoff waits for the file, before it counts as not written.
 * The types give no turn id for a prompt of a plugin, so the hook cannot tie the write turn to its end.
 * The first turn that ends is the write turn or a turn of the user that was queued before it.
 */
export const HANDOFF_WAIT_TURNS = 2;

/** The times that the hook submits the write prompt again for one trigger episode when no file appears. */
export const HANDOFF_RETRY_MAX = 1;

/** The values of the `mainHandover` option. */
export const MAIN_HANDOVERS = ["auto", "manual", "off"] as const;

/** One value of `mainHandover`, from `MAIN_HANDOVERS`. */
export type MainHandover = (typeof MAIN_HANDOVERS)[number];

/** The default of `mainHandover`. It stays `manual` until P14 measures the cost of a handoff against a compaction. */
export const DEFAULT_MAIN_HANDOVER: MainHandover = "manual";

/** The `maxTurns` of each agent type. A test pins each value to the front matter of the agent file. */
export const AGENT_MAX_TURNS: Readonly<Record<string, number>> = {
  investigator: 31,
  implementer: 61,
  debugger: 61,
  planner: 41,
  researcher: 41,
  reviewer: 41,
};
