/** Seconds in the 5 hour window of `rate_limits.five_hour`, 5 * 60 * 60. */
export const FIVE_HOUR_S = 18_000;
/** Seconds in the 7 day window of `rate_limits.seven_day`, 7 * 24 * 60 * 60. */
export const SEVEN_DAY_S = 604_800;
/** The most rows the items flow into. */
export const MAX_ROWS = 4;
/** The width when `COLUMNS` is absent or not a positive integer; a choice, 80 being the classic terminal width. */
export const DEFAULT_COLUMNS = 80;
/** Columns kept free at the right edge, a choice that leaves room for the `padding` of the `statusLine` setting. */
export const COLUMNS_MARGIN = 4;
/** The most subagent rows shown, a choice. */
export const SUBAGENT_ROWS_MAX = 20;
export const SPEC_CHANGES_SHOWN = 2;
/** The gap between two items of a row: a space, a middle dot, a space. */
export const ITEM_GAP = " · ";
/** The part of a limit window that must pass before a pace shows. */
export const PACE_MIN_FRACTION = 0.03;
/** Above this projected use at the window end, in percent, the use runs out before the reset. */
export const PROJECTED_RUNOUT = 100;
/** The columns a subagent row needs for its description before the description shows. */
export const DESCRIPTION_ROOM_MIN = 8;
/** The usage percents of the gradient stops: green at and below the first, amber at the second, red at and above the third. */
export const GRADIENT_GREEN_PERCENT = 20;
export const GRADIENT_AMBER_PERCENT = 60;
export const GRADIENT_RED_PERCENT = 90;
