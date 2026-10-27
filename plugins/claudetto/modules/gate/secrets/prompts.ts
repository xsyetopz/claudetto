// The text of the slice `secrets` that a person or the model reads.

/** The line in the context of a call when a bound stopped the scan for env files, so that the model does not take the result as clean. */
export const UNMASKED = (v: { why: string }): string =>
	`The filter did not mask the values of some env files, because ${v.why}.`;
export const WHY_FILES = (v: { max: number }): string =>
	`the project has more than ${v.max} env files`;
export const WHY_SIZE = (v: { max: number }): string =>
	`an env file is longer than ${v.max} characters`;
export const WHY_VALUES = (v: { max: number }): string =>
	`the filter keeps at most ${v.max} env file values for the time after a file is gone`;
export const WHY_SCAN = "the scan for env files did not end";

/** The line in the context of a call when the memory of short values is full. A file that exists masks its values, so the line is about the time after a file is gone. */
export const SHORT_VALUES_FULL = (v: { max: number }): string =>
	`The filter keeps at most ${v.max} short values in memory. Because of this limit, a short value of an env file may show in a result. This can happen after its file is gone.`;

/** The line in the context of a call when a bound of slow confirms made the filter mask some text with no check. */
export const CUT = (v: { max: number }): string =>
	`Because the result had more than ${v.max} matches to check, the filter masked some text with no check.`;
