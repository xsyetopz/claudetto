// Repository bounds, read only by the tests and the tools, so they do not ship in `plugins/`.
// A shared runtime bound is in `src/kernel/budget.ts`, and a slice bound is in `slices/<s>/limits.ts`.
// The rule is in `CLAUDE.md`, "Rules", and the wiki page `Bounds` lists each bound.

/** Most lines in a file that is not a test. */
export const FILE_MAX_LINES = 300;
/** Most lines in a test file (`*.test.*`). */
export const TEST_FILE_MAX_LINES = 500;
/** Most milliseconds for one test that makes a `git worktree`, because worktree creation on a slow runner can take more than the 5,000 ms of `bunfig.toml`. */
export const WORKTREE_TEST_TIMEOUT_MS = 15_000;
/** Most milliseconds for one test that starts many `git` processes, because a `merge` test on a slow runner can take more than the 5,000 ms of `bunfig.toml`. */
export const GIT_REPO_TEST_TIMEOUT_MS = 15_000;
/** Most milliseconds for one test that scans the bundle of the installed `claude`, which took 15 s under the CPU cap of `just docker`. */
export const BUNDLE_SCAN_TIMEOUT_MS = 60_000;

/** The lowest Claude Code version that claudetto is built for. `ci.yml` installs it, and the files of `schemas/` come from its bundle. */
export const MIN_CLAUDE_CODE_VERSION = "2.1.302";

/** The CPUs of the container of `just docker`, so a check does not take each CPU of the host. */
export const DOCKER_CPUS = 4;

/** Most US dollars for one `just eval` run, which the `eval` recipe of the `justfile` passes as `--max-cost-usd`. */
export const EVAL_MAX_COST_USD = 5;

/**
 * Most characters in one text in the code of a plugin or of the kernel: a string literal, or the sum of the fixed parts of a template literal.
 * A longer text goes to a `prompts/` folder. `tools/lint/prose-in-code.grit` holds the copies.
 */
export const CODE_TEXT_MAX_CHARS = 60;

/** Most characters in the `description` of an agent file, because the listing of agents goes into each request. */
export const AGENT_DESCRIPTION_MAX_CHARS = 300;

// Size targets of the text that goes into each request (1 KB is 1,024 bytes).
// A size above a high bound fails. A size below a low bound is reported and does not fail.
// `tools/sizes.ts` checks them.

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

/** Fewest bytes in the first request, with no tool schemas (8 KB, where 1 KB is 1,024 bytes). */
export const FIRST_REQUEST_LOW_BYTES = 8 * 1024;
/** Most bytes in the first request, with no tool schemas (16 KB). */
export const FIRST_REQUEST_HIGH_BYTES = 16 * 1024;

// Bounds of `just sandbox-linux`, checked by `tools/sandbox/linux/run.ts`.

/**
 * Fewest minutes of life of the access token before `just sandbox-linux` sends the login to its container.
 * A token near its expiry makes Claude Code in the container refresh it, and the refresh token of the host then fails.
 */
export const LINUX_TOKEN_MIN_MINUTES = 30;
/** The model of the one session of `just sandbox-linux`, which only runs one `Bash` call. */
export const LINUX_SESSION_MODEL = "haiku";

/** Fewest lines in a code file that is not an entry point (D41). An entry point is `slice.ts`, `plugin.ts`, `limits.ts`, or `adapters/mod.ts`. */
export const SHORT_FILE_MIN_LINES = 15;

/**
 * The line count of each part, which is the sum of the lines of its `.ts` files that are not tests (D40).
 * `just validate` fails when a part grows past its pin. Lower a pin when the part shrinks.
 */
export const PART_LINE_PINS: Record<string, number> = {
  "src/kernel": 1633,
  "src/plugins/claudetto-browser": 639,
  "src/plugins/claudetto-codegraph": 654,
  "src/plugins/claudetto-docs": 32,
  "src/plugins/claudetto-lab": 1896,
  "src/plugins/claudetto-sessions": 252,
  "src/plugins/claudetto/slices/advise": 352,
  "src/plugins/claudetto/slices/decide": 1216,
  "src/plugins/claudetto/slices/goal": 625,
  "src/plugins/claudetto/slices/ground": 377,
  "src/plugins/claudetto/slices/guard": 352,
  "src/plugins/claudetto/slices/handoff": 563,
  "src/plugins/claudetto/slices/prompt": 936,
  "src/plugins/claudetto/slices/sembr": 521,
  "src/plugins/claudetto/slices/setup": 354,
  "src/plugins/claudetto/slices/spec": 11,
  "src/plugins/claudetto/slices/statusline": 1209,
  "src/plugins/claudetto/slices/styles": 13,
  tools: 5104,
};

/** The short `tools/` files that `justfile` runs with `bun`, so that a recipe stays a file. */
export const RECIPE_FILES: readonly string[] = [
  "tools/lab.ts",
  "tools/update.ts",
];

/** The code files under `SHORT_FILE_MIN_LINES` that are allowed for now. Each entry is a merge of part 2 of task 10.8. */
export const SHORT_FILE_ALLOWED: readonly string[] = [];

/** The `domain/`, `adapters/`, and `prompts/` folders with one file that are allowed for now. Each entry is a merge of part 2 of task 10.8. */
export const THIN_FOLDER_ALLOWED: readonly string[] = [];
