export const METER_DELTA_USD = 89.11;

export const METER_DELTA_POINTS = 3;

export interface UsdPerPercent {
	mid: number;
	low: number;
	high: number;
}

export const USD_PER_WEEKLY_PERCENT: UsdPerPercent = {
	mid: METER_DELTA_USD / METER_DELTA_POINTS,
	low: METER_DELTA_USD / (METER_DELTA_POINTS + 1),
	high: METER_DELTA_USD / (METER_DELTA_POINTS - 1),
};

export interface WeeklyShare {
	mid: number;
	low: number;
	high: number;
}

export const weeklyShare = (usd: number): WeeklyShare => ({
	mid: usd / USD_PER_WEEKLY_PERCENT.mid,
	low: usd / USD_PER_WEEKLY_PERCENT.high,
	high: usd / USD_PER_WEEKLY_PERCENT.low,
});

export const shareText = (share: WeeklyShare): string =>
	`${share.mid.toFixed(1)}% (${share.low.toFixed(1)}% to ${share.high.toFixed(1)}%)`;
