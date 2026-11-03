// The numbers of the repository gate, in one file so that a rule and its test read the same value.

/** The least runs in one arm that a document may cite. */
export const EVAL_MIN_RUNS_PER_ARM = 10;

/** The model of each eval session, pinned because an unpinned session takes the account default, which can change between runs. */
export const EVAL_MODEL = "claude-opus-5-5";

export const MAX_SOURCE_LINES = 300;

export const MAX_TEST_LINES = 500;

/** The Claude Code version the framework is built against; `README.md` and the `ci` workflow must agree. */
export const MIN_CLAUDE_CODE_VERSION = "2.1.316";
