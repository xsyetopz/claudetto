// The numbers of the repository gate, in one file so that a rule and its test read the same value.

/** The least runs in one arm that a document may cite. */
export const EVAL_MIN_RUNS_PER_ARM = 10;

/** The model of each eval session, pinned because an unpinned session takes the account default, which can change between runs. */
export const EVAL_MODEL = "claude-opus-5-5";

export const MAX_SOURCE_LINES = 300;

export const MAX_TEST_LINES = 500;

/** The Claude Code version the framework is built against; `README.md` and the `ci` workflow must agree. */
export const MIN_CLAUDE_CODE_VERSION = "2.1.316";

/** In characters as the request carries the body, under the shipped settings, whose `autoMemoryEnabled: false` drops the memory section; `agents/main.md` replaces this body, so a larger one is a loss. */
export const DEFAULT_MAIN_BODY_CHARS = 3678;

export const MAIN_BODY_CAP = 6000;

/** In characters of the trimmed body; above the 1,540 of the built-in `Concise` style, because the file also carries the rules of the built-in `Proactive` style. */
export const OUTPUT_STYLE_CAP = 1936;
