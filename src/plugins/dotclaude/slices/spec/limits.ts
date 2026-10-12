// The bounds and the names of the `spec` slice.

/** The sizes of a change, from the smallest to the largest. */
export const SIZES = ["trivial", "medium", "large"] as const;

/** One size of a change, from `SIZES`. */
export type Size = (typeof SIZES)[number];

/** The size of `dotclaude-spec new` when the call has no `--size`. */
export const DEFAULT_SIZE: Size = "medium";

/** The most age, in milliseconds, of the usage sample that `dotclaude-spec runs` trusts. An older sample allows one run. */
export const USAGE_SAMPLE_MAX_MS = 10 * 60 * 1000;

/** The most characters of the file name of a hotfix record, without the date. */
export const HOTFIX_SLUG_MAX = 40;

/** The id of a change: it is also the name of its folder, so it is not `archive`. */
export const CHANGE_ID = /^(?!archive$)[0-9A-Za-z][0-9A-Za-z._-]*$/;
