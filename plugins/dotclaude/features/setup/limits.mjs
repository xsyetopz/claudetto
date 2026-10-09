// The bounds of setup, in one place.
// Tests pin the copies in the written settings to these values, so change a bound here and nowhere else.

/**
 * The `statusLine.refreshInterval` that setup writes, in seconds.
 * The countdowns show minutes, but the warning glyph of the cache and the context blinks each second,
 * so 1 is the largest value that keeps every shown unit current.
 * The value equals `REFRESH_SECONDS` of `features/statusline/limits.mjs`, and a test pins that.
 */
export const REFRESH_SECONDS = 1;
