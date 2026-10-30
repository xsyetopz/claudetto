/** Seconds in the 5 hour window of the subscription. */
export const FIVE_HOUR_S = /* 5 * 60 * 60 */ 18_000;
/** Seconds in the 7 day window of the subscription. */
export const SEVEN_DAY_S = /* 7 * 24 * 60 * 60 */ 604_800;
/** The rows the line can show: place, session, limits, cache. */
export const MAX_ROWS = 4;
/** The width when `COLUMNS` is absent or not a positive integer; a narrow guess cannot overflow a wide terminal. */
export const DEFAULT_COLUMNS = 80;
/** Columns kept free at the right edge: Claude Code adds its own spacing and the `padding` setting adds more, and a row that reaches the edge wraps. */
export const COLUMNS_MARGIN = 4;
/** The most subagent rows shown, since the panel is small. */
export const SUBAGENT_ROWS_MAX = 20;
/** The gap between two items of a row. */
export const ITEM_GAP = /* " · " */ " \u00B7 ";
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
