// The bounds of the `guard` slice.

/** The longest time of one `git` run for the gate, in milliseconds. A slower run fails the gate, and a person decides. */
export const GIT_TIMEOUT_MS = 5_000;

/** The most changed files of the work tree that the check of a bulk stage hashes. */
export const STAGE_FILES_MAX = 200;

/** The most files of the user that the check of a bulk stage names. */
export const STAGE_NAMES_MAX = 10;

/** The least `P(yes)` of Jev that allows a call: `1 - APPROVAL_MAX` of the `decide` slice, which a test pins. It is above the 0.7 of `primitives-noul.md` because the docs say "raise it when acting on a false yes is expensive", and a false yes here loses files. */
export const JEV_YES_MIN = 0.8;
