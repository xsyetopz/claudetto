// The arithmetic from dollars of total_cost_usd to a share of the seven-day limit, with the band of its one measurement.

/**
 * The cost that the second screen reading of `docs/window-weights.md`, section "The Rate, from the First
 * Reading to the Second", adds over the first: `$102.71` less `$13.60`, in the units of `total_cost_usd`
 * (read 2026-10-29).
 */
export const METER_DELTA_USD = 89.11;

/** The move of the meter's whole-percent weekly reading over that session: 28% to 31%, which is 3 points. */
export const METER_DELTA_POINTS = 3;

/** The dollars one weekly percent costs on this Max 20x login, as a measured middle and the band around it. */
export interface UsdPerPercent {
	/** The measured middle, `$29.70` to the cent. */
	mid: number;
	/** The cheapest a percent can be, `$22.28`: the meter moved 4 points that rounded down to 3. */
	low: number;
	/** The dearest a percent can be, `$44.55`: the meter moved 2 points that rounded up to 3. */
	high: number;
}

/**
 * The dollars per weekly percent, computed from the one measurement and not typed in. The meter shows
 * whole percents, so a 3-point move is somewhere between 2 and 4 points and the band is the dollars
 * over each. That makes the band lopsided: dividing by 2 reaches `$44.55` above the middle and dividing
 * by 4 only `$22.28` below it. Other sessions on the account also move the week, so the true price of
 * a percent can only be lower than the middle, and the band's upper end is the bound of the rounding alone.
 */
export const USD_PER_WEEKLY_PERCENT: UsdPerPercent = {
	mid: METER_DELTA_USD / METER_DELTA_POINTS,
	low: METER_DELTA_USD / (METER_DELTA_POINTS + 1),
	high: METER_DELTA_USD / (METER_DELTA_POINTS - 1),
};

/** A share of the seven-day limit in percent, as a middle and the band that the dollar band gives it. */
export interface WeeklyShare {
	/** `usd` over the middle price of a percent. */
	mid: number;
	/** `usd` over the dearest price of a percent, which is the smallest share the run can take. */
	low: number;
	/** `usd` over the cheapest price of a percent, which is the largest share the run can take. */
	high: number;
}

/** The share of the seven-day limit that `usd` of `total_cost_usd` takes, in percent, with its band. */
export const weeklyShare = (usd: number): WeeklyShare => ({
	mid: usd / USD_PER_WEEKLY_PERCENT.mid,
	low: usd / USD_PER_WEEKLY_PERCENT.high,
	high: usd / USD_PER_WEEKLY_PERCENT.low,
});

/** The share as text at one decimal: the middle, then the band, for example `7.1% (4.7% to 9.4%)`. */
export const shareText = (share: WeeklyShare): string =>
	`${share.mid.toFixed(1)}% (${share.low.toFixed(1)}% to ${share.high.toFixed(1)}%)`;
