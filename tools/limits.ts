// The numbers of the repository gate, in one file so that a rule and its test read the same value.

/**
 * The least runs in one arm that a document may cite.
 * It is the citable floor that the paid probe printed before each round
 * (`docs/evidence/code-compaction-probe.md:363`).
 */
export const EVAL_MIN_RUNS_PER_ARM = 10;

/** The most lines a source file may hold. */
export const MAX_SOURCE_LINES = 300;

/** The most lines a test file may hold. */
export const MAX_TEST_LINES = 500;

/**
 * The Claude Code version the framework is built and tested against, which is the version
 * that wrote the vendored types under `plugins/claudetto/.claude-plugin/types/`.
 * `README.md` names it as the least supported version, and the `ci` workflow installs it.
 */
export const MIN_CLAUDE_CODE_VERSION = "2.1.312";
