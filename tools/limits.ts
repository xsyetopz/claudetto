// Repository bounds, read only by the tests and the tools, so they do not ship in `plugins/`.
// A shared runtime bound is in `src/kernel/budget.ts`, and a slice bound is in `slices/<s>/limits.ts`.
// The rule is in `CLAUDE.md`, "Rules", and the wiki page `Bounds` lists each bound.

/** Most milliseconds for one test that makes a `git worktree`, because worktree creation on a slow runner can take more than the 5,000 ms of `bunfig.toml`. */
export const WORKTREE_TEST_TIMEOUT_MS = 15_000;
/** Most milliseconds for one test that starts many `git` processes, because a `merge` test on a slow runner can take more than the 5,000 ms of `bunfig.toml`. */
export const GIT_REPO_TEST_TIMEOUT_MS = 15_000;
/** Most milliseconds for one test that scans the bundle of the installed `claude`, which took 15 s under the CPU cap of `just docker`. */
export const BUNDLE_SCAN_TIMEOUT_MS = 60_000;

/** Fewest runs in each arm of an eval that a wiki claim may cite, which `just validate` checks (D25). */
export const EVAL_MIN_RUNS_PER_ARM = 10;

/** The lowest Claude Code version that claudetto is built for. `ci.yml` installs it, and the files of `schemas/` come from its bundle. */
export const MIN_CLAUDE_CODE_VERSION = "2.1.303";

/** The CPUs of the container of `just docker`, so a check does not take each CPU of the host. */
export const DOCKER_CPUS = 4;

/** Most US dollars for one `just eval` run, which the `eval` recipe of the `justfile` passes as `--max-cost-usd`. */
export const EVAL_MAX_COST_USD = 5;

// Bounds of `just sandbox-linux`, checked by `tools/sandbox/linux/run.ts`.

/**
 * Fewest minutes of life of the access token before `just sandbox-linux` sends the login to its container.
 * A token near its expiry makes Claude Code in the container refresh it, and the refresh token of the host then fails.
 */
export const LINUX_TOKEN_MIN_MINUTES = 30;
/** The model of the one session of `just sandbox-linux`, which only runs one `Bash` call. */
export const LINUX_SESSION_MODEL = "haiku";
