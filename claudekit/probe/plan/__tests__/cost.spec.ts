import { describe, expect, test } from "bun:test";
import { shareText, weeklyShare } from "../../../price/share.ts";
import { costLine, expectedTokens } from "../cost.ts";

describe("costLine", () => {
	test("takes its weekly share from the round's tokens", () => {
		const share = shareText(weeklyShare(expectedTokens(20, 2)));

		const line = costLine(20, 2);

		expect(line).toContain(`about ${share} of the weekly limit`);
	});
});
