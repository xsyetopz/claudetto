import { expect, test } from "claude-code/testing";

import { typedTurns } from "../../__tests__/idling";
import {
	checkIn,
	freshBox,
	MOUNT,
	offered,
	promptsOf,
	settle,
	untilShown
} from "../../__tests__/testkit";

test(
	"a check request names the offers shown earlier and the lines marked known",
	MOUNT,
	async ($, on) => {
		// Arrange
		const box = freshBox();
		const band = await offered($, on, box, {
			replies: ["learn: SEEN-ONE.", "learn: KNOWN-ONE.", "learn: none"]
		});
		await typedTurns($, ["t2", "t3"]);
		await checkIn($, "t4");
		await untilShown(band, "Learn more");
		await band.press({ key: "Knew this already" });
		await settle();

		// Act
		await checkIn($, "t5");
		const [first, , third] = promptsOf(box);

		// Assert
		expect(first).not.toContain("SEEN-ONE");
		expect(first).not.toContain("KNOWN-ONE");
		expect(third).toContain("SEEN-ONE");
		expect(third).toContain("KNOWN-ONE");
	}
);

test(
	"Learn more with no shipped explanation asks the fork about the offered line",
	MOUNT,
	async ($, on) => {
		// Arrange
		const box = freshBox();
		const band = await offered($, on, box, {
			replies: ["learn: TOPIC-LINE.", "**Title**\nA body."]
		});

		// Act
		await band.press({ key: "Learn more" });
		await untilShown(band, "Understood");
		const [, explain] = promptsOf(box);

		// Assert
		expect(explain).toContain("TOPIC-LINE");
	}
);
