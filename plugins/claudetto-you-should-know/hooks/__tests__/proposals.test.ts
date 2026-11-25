import { expect, test } from "claude-code/testing";

import { typedTurns } from "./idling";
import {
	checkIn,
	freshBox,
	isOffered,
	MOUNT,
	offered,
	settle,
	untilShown
} from "./testkit";

const lineReply = (line: string): string => `learn: ${line}\ntag: Heads up`;

test(
	"three ignored offers skip the next eligible check, and the skip is used up",
	MOUNT,
	async ($, on) => {
		// Arrange
		const box = freshBox();
		const band = await offered($, on, box, {
			replies: ["One.", "Two.", "Three.", "Four.", "Five."].map((reply) =>
				lineReply(reply)
			)
		});
		await typedTurns($, ["t2", "t3"]);
		await checkIn($, "t4");
		await untilShown(band, "Learn more");
		await typedTurns($, ["t5", "t6"]);
		await checkIn($, "t7");
		await untilShown(band, "Learn more");

		// Act
		await typedTurns($, ["t8", "t9"]);
		const beforeSkip = box.forks;
		await checkIn($, "t10");
		const afterSkip = box.forks;
		await checkIn($, "t11");

		// Assert
		expect(beforeSkip).toBe(3);
		expect(afterSkip).toBe(3);
		expect(box.forks).toBe(4);
	}
);

test(
	"an answer in between restarts the count of ignored offers",
	MOUNT,
	async ($, on) => {
		// Arrange
		const box = freshBox();
		const band = await offered($, on, box, {
			replies: ["One.", "Two.", "Three.", "Four.", "Five."].map((reply) =>
				lineReply(reply)
			)
		});
		await typedTurns($, ["t2", "t3"]);
		await checkIn($, "t4");
		await untilShown(band, "Learn more");
		await typedTurns($, ["t5", "t6"]);
		await checkIn($, "t7");
		await untilShown(band, "Learn more");
		await band.press({ key: "Knew this already" });
		await settle();
		await checkIn($, "t8");
		await untilShown(band, "Learn more");

		// Act
		await typedTurns($, ["t9", "t10"]);
		await checkIn($, "t11");

		// Assert
		expect(box.forks).toBe(5);
	}
);

for (const again of [
	"learn: Tests run in order.",
	"learn: TESTS RUN IN ORDER"
]) {
	test(
		`a line offered earlier is not offered again when proposed as "${again}"`,
		MOUNT,
		async ($, on) => {
			// Arrange
			const box = freshBox();
			const band = await offered($, on, box, {
				replies: ["learn: Tests run in order.", again]
			});
			await typedTurns($, ["t2", "t3"]);

			// Act
			await checkIn($, "t4");

			// Assert
			expect(box.forks).toBe(2);
			expect(await isOffered(band)).toBe(false);
		}
	);
}

test(
	"a line marked as known is not offered again in any case",
	MOUNT,
	async ($, on) => {
		// Arrange
		const box = freshBox();
		const band = await offered($, on, box, {
			replies: ["learn: Tests run in order.", "learn: tests run in order."]
		});
		await band.press({ key: "Knew this already" });
		await settle();

		// Act
		await checkIn($, "t2");

		// Assert
		expect(box.forks).toBe(2);
		expect(await isOffered(band)).toBe(false);
	}
);
