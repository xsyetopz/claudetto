// The bounds of the window report.

/**
 * The least rows that a weight needs, counted twice: the measure rows that hold a delta of the window,
 * and the turns that reported tokens. Below it `weightOf` in `src/window/report.ts` says "not measured".
 *
 * No reading supports a larger floor. `EVAL_MIN_RUNS_PER_ARM` in `tools/limits.ts` is 10 because the
 * paid probe printed it as the citable floor for runs of an arm, which is a different quantity, and no
 * run has measured how the whole-number lag of the window percentages spreads over rows. So this is the
 * smallest value that is more than one reading: a single row is one reading of a window that lags, and
 * `perTask` already marks it "too few rows". Two rows is the least that is a sum over turns. It does
 * not make the figure precise, and the count of turns is printed beside the weight so a reader weighs
 * it. A reading of how the weight settles as rows are added is what would move this number.
 *
 * It lives here and not in `tools/limits.ts` because the plugin ships without `tools/`.
 */
export const WEIGHT_MIN_ROWS = 2;
