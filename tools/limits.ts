// Repository bounds, read only by the tests and the tools, so they do not ship in `plugins/`.
// A shared runtime bound is in `plugins/claudetto/kernel/budget.ts`, and a slice bound is in `slices/<s>/limits.ts`.
// The rule is in `.claude/rules/bounds.md`, and the wiki page `Bounds` lists each bound.

/** Most milliseconds for one test that makes a `git worktree`, because worktree creation on a slow runner can take more than the 5,000 ms of `bunfig.toml`. */
export const WORKTREE_TEST_TIMEOUT_MS = 15_000;
/** Most milliseconds for one test that scans the bundle of the installed `claude`, which took 15 s under the CPU cap of `just docker`. */
export const BUNDLE_SCAN_TIMEOUT_MS = 60_000;
/** Most milliseconds for one `claude` run against the stub of the Messages API, which took 1.4 s headless and 10 s in a terminal. */
export const STUB_RUN_TIMEOUT_MS = 30_000;
/** Most milliseconds for `bunx -y ctx7@<pin> --help`, which took 1.4 s with an empty Bun cache. */
export const CTX7_HELP_TIMEOUT_MS = 30_000;
/** Most milliseconds for one run of the OpenSpec CLI of the dev dependencies, which took about 1 s. */
export const OPENSPEC_RUN_TIMEOUT_MS = 30_000;
/** Most milliseconds for all the stub runs of the settings pin test, which run 6 at a time. */
export const PIN_RUNS_TIMEOUT_MS = 180_000;
/** Most stub runs at a time, so that the pin test does not take each CPU of the host. */
export const STUB_RUNS_AT_ONCE = 6;

/** Fewest runs in each arm of an eval that a wiki claim may cite, which `just validate` checks (D25). */
export const EVAL_MIN_RUNS_PER_ARM = 10;

/** Most tool calls that the `max-tool-calls` tag of an eval case may allow, which `just validate` checks (D25). */
export const EVAL_MAX_TOOL_CALLS = 60;
/** Most input and output tokens that the `max-tokens` tag of an eval case may allow, which `just validate` checks (D25). */
export const EVAL_MAX_TOKENS = 200_000;

/** The lowest Claude Code version that claudetto is built for. `ci.yml` installs it, and the files of `schemas/` come from its bundle. */
export const MIN_CLAUDE_CODE_VERSION = "2.1.309";

/** Most tokens of one `SKILL.md`, because after a compaction Claude Code keeps only 5,000 tokens of each skill that ran (`extend/skills-and-commands/substitutions.md`, "Lifecycle", Documented). */
export const SKILL_MAX_TOKENS = 5_000;

/** The CPUs of the container of `just docker`, so a check does not take each CPU of the host. */
export const DOCKER_CPUS = 4;

/** Most US dollars for one `just eval` run, which the `eval` recipe of the `justfile` passes as `--max-cost-usd`. */
export const EVAL_MAX_COST_USD = 5;

/** Confidence level of each interval that `just eval-stats` prints: the Newcombe interval of a case and the bootstrap interval of a set. */
export const EVAL_STATS_CONFIDENCE = 0.95;
/** Resamples of the bootstrap over the cases of a set in `just eval-stats`. */
export const EVAL_STATS_RESAMPLES = 10_000;
/** Default seed of the bootstrap in `just eval-stats`, so a rerun prints the same interval. The `--seed` flag changes it. */
export const EVAL_STATS_SEED = 20_261_019;

// Bounds of `just sandbox-linux`, checked by `tools/sandbox/linux/run.ts`.

/**
 * Fewest minutes of life of the access token before `just sandbox-linux` sends the login to its container.
 * A token near its expiry makes Claude Code in the container refresh it, and the refresh token of the host then fails.
 */
export const LINUX_TOKEN_MIN_MINUTES = 30;
/** The model of the one session of `just sandbox-linux`, which only runs one `Bash` call. */
export const LINUX_SESSION_MODEL = "haiku";

/** Most parts of one request that `just capture` sizes with a `count_tokens` call. */
export const MAX_PART_COUNTS = 64;
/** Most attempts of one `count_tokens` call when the endpoint answers HTTP 429. */
export const COUNT_ATTEMPTS = 4;
/** Milliseconds to wait before the second attempt of a `count_tokens` call, which doubles for each later wait. */
export const COUNT_BACKOFF_MS = 500;
/** Most characters of a text block that `just capture` sizes as one part. */
export const SPLIT_CHARS = 2000;
