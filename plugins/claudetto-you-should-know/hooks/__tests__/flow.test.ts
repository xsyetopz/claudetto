import { expect, test } from "claude-code/testing";

import {
	type Box,
	freshBox,
	MOUNT,
	offered,
	pause,
	textOf,
	until,
	untilGone,
	untilShown
} from "./testkit";

test(
	"Learn more shows the explanation that came with the offer, without a second fork",
	MOUNT,
	async ($, on) => {
		// Arrange
		const box = freshBox();
		const band = await offered($, on, box);

		// Act
		await band.press({ key: "Learn more" });
		await untilShown(band, "Understood");

		// Assert
		expect(await band.find({ key: "Chat in main session" })).toBeDefined();
		expect(await textOf(band)).toContain("They run one after another");
		expect(box.forks).toBe(1);
	}
);

test(
	"Knew this already clears the offer with no toast",
	MOUNT,
	async ($, on) => {
		// Arrange
		const box = freshBox();
		const band = await offered($, on, box);

		// Act
		await band.press({ key: "Knew this already" });
		await untilGone(band, "Learn more");

		// Assert
		expect(await band.find({ key: "Learn more" })).toBeUndefined();
		expect(box.toasts).toEqual([]);
	}
);

test(
	"Dismiss shows the asked row with its one-shot buttons",
	MOUNT,
	async ($, on) => {
		// Arrange
		const band = await offered($, on, freshBox());

		// Act
		await band.press({ key: "Dismiss" });
		await untilShown(band, "Not relevant");

		// Assert
		expect(await band.find({ key: "That was helpful" })).toBeDefined();
		expect(await band.find({ key: "Not relevant" })).toBeDefined();
	}
);

test(
	"Disable arms on the first press, then fills the off command and never runs it",
	MOUNT,
	async ($, on) => {
		// Arrange
		const box = freshBox();
		const band = await offered($, on, box);

		// Act
		await band.press({ key: "Disable" });
		await pause();
		const afterFirst = [...box.filled];
		await band.press({ key: "Press again to disable" });
		await until(() => box.filled.length > 0, 50);

		// Assert
		expect(afterFirst).toEqual([]);
		expect(box.filled).toEqual(["/plugin disable claudetto-you-should-know"]);
		expect(box.submitted ?? []).toEqual([]);
	}
);

test(
	"Disable with text in the box toasts and fills nothing",
	MOUNT,
	async ($, on) => {
		// Arrange
		const box: Box = { ...freshBox(), text: "half a thought" };
		const band = await offered($, on, box);

		// Act
		await band.press({ key: "Disable" });
		await pause();
		await band.press({ key: "Press again to disable" });
		await until(() => box.toasts.length > 0, 50);

		// Assert
		expect(box.toasts.length).toBe(1);
		expect(box.filled).toEqual([]);
	}
);
