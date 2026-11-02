/** A reading of the seven-day meter, against the dollars `table.ts` prices from the transcripts over the same week. */
export interface MeterReading {
	readonly date: string;
	readonly usd: number;
	/** The meter shows whole points, so each reading is good to one point either way. */
	readonly points: number;
}

export const METER_READINGS: readonly MeterReading[] = [
	// The week of 2026-10-26 ran out of its limit; the transcripts price its calls at $1,132.87.
	{ date: "2026-10-31", usd: 1132.87, points: 100 },
	// The status line read 11% at 16:17 UTC; the transcripts and eval sessions of the week so far price at $109.33.
	{ date: "2026-11-02", usd: 109.33, points: 11 },
];

export interface UsdPerPercent {
	mid: number;
	low: number;
	high: number;
}

let usdRead = 0;
let pointsRead = 0;
for (const reading of METER_READINGS) {
	usdRead += reading.usd;
	pointsRead += reading.points;
}

export const USD_PER_WEEKLY_PERCENT: UsdPerPercent = {
	mid: usdRead / pointsRead,
	low: usdRead / (pointsRead + METER_READINGS.length),
	high: usdRead / (pointsRead - METER_READINGS.length),
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
