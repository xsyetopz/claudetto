import { describe, expect, test } from "bun:test";
import { costLine, expectedUsd } from "../cost.ts";
import { shareText, USD_PER_WEEKLY_PERCENT, weeklyShare } from "../share.ts";

describe("USD_PER_WEEKLY_PERCENT", () => {
	test("reproduces the middle and the band of the screen reading to the cent", () => {
		const { mid, low, high } = USD_PER_WEEKLY_PERCENT;

		expect(mid.toFixed(2)).toBe("29.70");
		expect(low.toFixed(2)).toBe("22.28");
		expect(high.toFixed(2)).toBe("44.55");
	});

	test("is lopsided, the upper end farther from the middle than the lower", () => {
		const { mid, low, high } = USD_PER_WEEKLY_PERCENT;

		expect(high - mid).toBeGreaterThan(mid - low);
	});
});

describe("weeklyShare", () => {
	test("puts $210 at about 7% with a band of 4.7% to 9.4%", () => {
		const share = weeklyShare(210);

		expect(share.mid.toFixed(0)).toBe("7");
		expect(share.low.toFixed(1)).toBe("4.7");
		expect(share.high.toFixed(1)).toBe("9.4");
	});

	test("puts $30 at about 1.0% with a band of 0.7% to 1.3%", () => {
		const share = weeklyShare(30);

		expect(share.mid.toFixed(1)).toBe("1.0");
		expect(share.low.toFixed(1)).toBe("0.7");
		expect(share.high.toFixed(1)).toBe("1.3");
	});

	test("puts nothing at nothing", () => {
		expect(weeklyShare(0)).toEqual({ mid: 0, low: 0, high: 0 });
	});
});

describe("costLine", () => {
	test("takes its weekly share and band from the function", () => {
		const share = shareText(weeklyShare(expectedUsd(20, 2)));

		const line = costLine(20, 2);

		expect(line).toContain(share);
	});
});
