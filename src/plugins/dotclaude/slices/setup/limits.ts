// The bounds of the `setup` slice, in one place.
// Tests read these values, so change a bound here and nowhere else.

/** The lowest Bun version that the CLIs, hooks, and bins of the plugins need. `engines.bun` of `package.json` has the same value. */
export const BUN_MIN = "1.4.3";

/** The most key paths that the line of missing snippet values names. The line gives the count of the rest. */
export const GAP_KEYS_MAX = 8;
