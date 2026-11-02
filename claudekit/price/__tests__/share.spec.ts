import { describe, expect, test } from "bun:test";
import {
	METER_READINGS,
	shareText,
	USD_PER_WEEKLY_PERCENT,
	weeklyShare,
} from "../share.ts";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

describe("USD_PER_WEEKLY_PERCENT", () => {
	test("pools the dated meter readings to the cent", () => {
		const { mid, low, high } = USD_PER_WEEKLY_PERCENT;

		expect(mid.toFixed(2)).toBe("11.19");
		expect(low.toFixed(2)).toBe("10.99");
		expect(high.toFixed(2)).toBe("11.40");
	});

	test("rests on more than one reading, each with its date", () => {
		expect(METER_READINGS.length).toBeGreaterThan(1);
		for (const { date } of METER_READINGS) {
			expect(date).toMatch(DATE);
		}
	});

	test("is lopsided, the upper end farther from the middle than the lower", () => {
		const { mid, low, high } = USD_PER_WEEKLY_PERCENT;

		expect(high - mid).toBeGreaterThan(mid - low);
	});
});

describe("weeklyShare", () => {
	test("puts the week of 2026-10-26, priced from the transcripts, within 5 points of the meter's 100%", () => {
		expect(Math.abs(weeklyShare(1132.87).mid - 100)).toBeLessThanOrEqual(5);
	});

	test("puts $30 at about 2.7% with a band of 2.6% to 2.7%", () => {
		const share = weeklyShare(30);

		expect(share.mid.toFixed(1)).toBe("2.7");
		expect(share.low.toFixed(1)).toBe("2.6");
		expect(share.high.toFixed(1)).toBe("2.7");
	});

	test("puts nothing at nothing", () => {
		expect(weeklyShare(0)).toEqual({ mid: 0, low: 0, high: 0 });
	});
});

describe("shareText", () => {
	test("prints the middle and the band at one decimal", () => {
		expect(shareText(weeklyShare(210))).toBe("18.8% (18.4% to 19.1%)");
	});
});
