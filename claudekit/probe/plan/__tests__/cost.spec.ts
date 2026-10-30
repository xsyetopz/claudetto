import { describe, expect, test } from "bun:test";
import { shareText, weeklyShare } from "../../../price/share.ts";
import { costLine, expectedUsd } from "../cost.ts";

describe("costLine", () => {
	test("takes its weekly share and band from the function", () => {
		const share = shareText(weeklyShare(expectedUsd(20, 2)));

		const line = costLine(20, 2);

		expect(line).toContain(share);
	});
});
