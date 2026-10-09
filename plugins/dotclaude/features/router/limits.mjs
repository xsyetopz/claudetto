// The router bounds of dotclaude, in one place.
// Tests pin the copies in the agent files and the status line to these values, so change a bound here and nowhere else.

/** The effort levels from the lowest to the highest. `max` is the top that a request names, and Claude Code clamps it to `xhigh` (task 2.10). */
export const EFFORT_ORDER = ["low", "medium", "high", "xhigh", "max"];

/**
 * The efforts that the router and the agent files may use, for each roster model, by full model id.
 * No list holds `max`, because the router never chooses it and a hook-set `max` arrives as `xhigh` (task 2.10).
 * Sonnet 5.5 has no `xhigh`, because it costs about as much as Opus 5.5 for a lower score (`model-routing.md` section 4).
 * Fable 5.1 and Mythos 5.1 have no task class, and run only when the user selects them, so the router never reads their lists.
 * `claude-haiku-4-5` is not here: it takes no `effort`, and it is out of the roster.
 */
export const ALLOWED_EFFORTS = {
  "claude-opus-5-5": ["low", "medium", "high", "xhigh"],
  "claude-sonnet-5-5": ["low", "medium", "high"],
  "claude-haiku-5-5": ["low", "medium", "high", "xhigh"],
  "claude-fable-5-1": ["low", "medium", "high", "xhigh"],
};

/** The prompt tokens above which each request on Haiku 5.5 costs 5x (`model-routing.md` section 1.1). */
export const HAIKU_PROMPT_MAX_TOKENS = 100_000;

/** The characters for one token in the length estimate of a prompt. This is an estimate, not a count. */
export const CHARS_PER_TOKEN = 4;

/** The failed fixes after which a debug task goes to Opus 5.5. */
export const ESCALATE_AFTER_FAILED_FIXES = 2;

/** The subagents that the module remembers for the `turn.step` applier. The oldest entry leaves first. */
export const SUBAGENT_MAP_MAX = 200;
