import { expect, test } from "claude-code/testing";

import {
	type Box,
	gate,
	MOUNT,
	offered,
	pause,
	until,
	untilGone,
	untilShown
} from "./testkit";

/** Draws the band as text, for a copy check. */
const textOf = async (band: {
	drawn: () => Promise<unknown>;
}): Promise<string> => JSON.stringify(await band.drawn());

const fresh = (): Box => ({ text: "", filled: [], toasts: [], forks: 0 });

test(
	"Learn more with no shipped explanation shows One moment… until the explanation arrives (REQ-YOU-SHOULD-KNOW-044)",
	MOUNT,
	async ($, on) => {
		// Arrange
		const { hold, release } = gate();
		const band = await offered($, on, fresh(), {
			replies: [
				"learn: Tests run in order.\ntag: You should know",
				"**Order matters**\nThey run one after another."
			],
			holdLater: hold
		});

		// Act
		await band.press({ key: "Learn more" });
		await until(async () => {
			const text = await textOf(band);
			return text.includes("One moment…");
		}, 50);
		const waiting = await textOf(band);
		release();
		await untilShown(band, "Understood");

		// Assert
		expect(waiting).toContain("One moment…");
		expect(waiting).not.toContain("They run one after another");
		expect(await textOf(band)).not.toContain("One moment…");
		expect(await textOf(band)).toContain("They run one after another");
	}
);

test(
	"a refused off fill shows the turn-off failure with OK, and OK clears it (REQ-YOU-SHOULD-KNOW-044)",
	MOUNT,
	async ($, on) => {
		// Arrange
		const box = fresh();
		const band = await offered($, on, box, { refuse: true });

		// Act
		await band.press({ key: "Disable" });
		await pause();
		await band.press({ key: "Press again to disable" });
		await untilShown(band, "OK");
		const failed = await textOf(band);
		await band.press({ key: "OK" });
		await untilGone(band, "OK");

		// Assert
		expect(failed).toContain(
			"Couldn’t turn suggestions off here. Use /plugin."
		);
		expect(box.filled).toEqual([]);
		expect(await textOf(band)).not.toContain("Couldn’t");
	}
);
