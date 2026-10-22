// The bounds of the `guard` slice.

/** The longest time of one `git` run that gives the gate the state of the paths. A slower run fails the gate, and a person decides. */
export const GIT_TIMEOUT_MS = 5_000;

/**
 * The longest time of the one Jev run that decides an `ask` of the gate, in milliseconds.
 * It is `ATTEMPT_TIMEOUT_MS` of the `decide` slice, so a slow API costs at most one try, and a test pins that.
 */
export const JEV_TIMEOUT_MS = 12_000;

/** The least `P(yes)` of Jev that allows a call: `1 - APPROVAL_MAX` of the `decide` slice, which a test pins. */
export const JEV_YES_MIN = 0.8;
