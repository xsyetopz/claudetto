// The bounds of the `turngate` slice, in one place.

/** The model of the judge. It is not Haiku, because the Haiku 5.5 card reports more false completion claims (§6.2.3). */
export const JUDGE_MODEL = "sonnet";

/** The effort of the judge. Sonnet 5.5 skips checks at `low` effort. */
export const JUDGE_EFFORT = "medium";

/** The time limit of one judge call, in milliseconds. */
export const JUDGE_TIMEOUT_MS = 30_000;

/** The token cap of one judge reply. */
export const JUDGE_MAX_TOKENS = 1024;

/** The input and output tokens of one judge call, for `evals/hooks.json`. Task 21.6 measured about 900 with no request and no earlier reply, and the two add at most about 1,000. */
export const JUDGE_TOKENS = 2500;

/** The most tool calls of one turn that the summary of the judge names. The summary gives the count of the others. */
export const MAX_CALLS = 60;

/** The most characters of the first line and of the end of the last line of a target, which the summary joins with ` … ` (D22). */
export const TARGET_PART_CHARS = 80;

/** The most characters of the error of one tool call in the summary. */
export const MAX_ERROR_CHARS = 160;

/** The most characters of the start of the reply that the judge gets. */
export const REPLY_HEAD_CHARS = 2000;

/** The most characters of the end of the reply that the judge gets. */
export const REPLY_TAIL_CHARS = 6000;

/** The most characters of the end of the last user prompt that the judge gets. */
export const REQUEST_CHARS = 2000;

/** The most characters of the end of the earlier reply that the judge gets. */
export const EARLIER_CHARS = 2000;

/** The most characters of the quote of the judge in the block reason. */
export const MAX_QUOTE_CHARS = 300;

/** The most agents with a record. The oldest record goes when a new agent comes. */
export const MAX_AGENTS = 64;
