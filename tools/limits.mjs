// Repository bounds. Only tests and tools read them, so they do not ship in
// `plugins/` (design D18: shared runtime bounds are in
// `plugins/dotclaude/lib/budget.mjs`, feature bounds in
// `features/<name>/limits.mjs`).

/** Most lines in a file that is not a test. */
export const FILE_MAX_LINES = 300;
/** Most lines in a test file (`*.test.*`). */
export const TEST_FILE_MAX_LINES = 500;

/** Most characters in the `description` of an agent file, because the listing of agents goes into each request. */
export const AGENT_DESCRIPTION_MAX_CHARS = 300;

// Size targets of the text that goes into each request (1 KB is 1,024 bytes).
// A size above a high bound fails. A size below a low bound is reported and does not fail.
// `tools/sizes.mjs` checks them.

/** Most bytes in a `CLAUDE.md` or `AGENTS.md` file (6 KB, where 1 KB is 1,024 bytes). */
export const CLAUDE_MD_MAX_BYTES = 6 * 1024;

/** Fewest bytes in the frontmatter `name` and `description` of one skill together. */
export const SKILL_META_LOW_BYTES = 150;
/** Most bytes in the frontmatter `name` and `description` of one skill together. */
export const SKILL_META_HIGH_BYTES = 300;

/** Fewest bytes in the skill metadata of all `SKILL.md` files under `plugins/` together (5 KB, where 1 KB is 1,024 bytes). */
export const SKILL_META_TOTAL_LOW_BYTES = 5 * 1024;
/** The target for the skill metadata of all skills together (8 KB). A larger sum is reported. */
export const SKILL_META_TOTAL_HIGH_BYTES = 8 * 1024;
/** The ceiling for the skill metadata of all skills together (15 KB). A larger sum fails. */
export const SKILL_META_TOTAL_MAX_BYTES = 15 * 1024;

/** Fewest bytes in a `SKILL.md` body, the text after the frontmatter (2 KB, where 1 KB is 1,024 bytes). */
export const SKILL_BODY_LOW_BYTES = 2 * 1024;
/** Most bytes in a `SKILL.md` body (8 KB). */
export const SKILL_BODY_HIGH_BYTES = 8 * 1024;

/** Fewest bytes in the first request, with no tool schemas (8 KB, where 1 KB is 1,024 bytes). `just measure` checks it. */
export const FIRST_REQUEST_LOW_BYTES = 8 * 1024;
/** Most bytes in the first request, with no tool schemas (16 KB). `just measure` checks it. */
export const FIRST_REQUEST_HIGH_BYTES = 16 * 1024;

// Eval harness bounds (`tools/eval/`, design D9).

/** Cost limit of one `just eval` in US dollars, when no `--limit` is given. */
export const EVAL_COST_LIMIT_USD = 20;
/** Runs of each case and arm, when no `--runs` is given. */
export const EVAL_RUNS_DEFAULT = 3;
/** Runs at the same time, when no `--concurrency` is given. */
export const EVAL_CONCURRENCY_DEFAULT = 4;
/** Resamples of the paired bootstrap. */
export const EVAL_BOOTSTRAP_RESAMPLES = 10_000;
/** Confidence of the bootstrap interval. */
export const EVAL_CONFIDENCE = 0.95;
/** Seed of the bootstrap, so that a report is the same on every build. */
export const EVAL_BOOTSTRAP_SEED = 20_280;
/**
 * Largest loss in a rate that the router search counts as noise (design D12).
 * The figure of 0.05 is a proposal, not a fitted value.
 */
export const EVAL_ROUTER_NOISE = 0.05;
/** Most characters of the container stderr that the run record keeps (the first part). */
export const EVAL_STDERR_CHARS = 4000;
/** Most characters of the container stdout that the run record keeps (the last part). */
export const EVAL_STDOUT_TAIL_CHARS = 2000;
/** Wall time of one run in seconds. */
export const EVAL_RUN_TIMEOUT_S = 900;
/**
 * Cost in US dollars that the suite charges for a run that timed out, because that run has no `result` event and no price table exists.
 * The figure of 2 is a proposal, not a measured value.
 */
export const EVAL_TIMEOUT_CHARGE_USD = 2;
/**
 * Fewest paired runs of a candidate pair before the router search can accept it.
 * A class has 3 cases, and a run has 3 repeats by default, so 9 is one full default suite.
 */
export const EVAL_ROUTER_MIN_PAIRS = 9;
/** Largest ratio between the evidence of two options in a neutral question. */
export const EVAL_SKEW_RATIO_MAX = 2;

// Start-of-session bound (`tools/measure.mjs`, design D4).

/**
 * Most tokens in the first request of a dotclaude session (input, cache creation, and cache read).
 * The 2.5 capture of the 0.27.0 profile (`research/capture.md`) billed 19,443 tokens in the first request,
 * and 19,443 plus 5% headroom, rounded up, is 20,416.
 * Task 9.7 sets it again from the measure after the cuts.
 */
export const START_TOKENS = 20_416;
