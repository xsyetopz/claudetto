import { expect, test } from "claude-code/testing";

import {
	type Band,
	type Box,
	completeTurn,
	isOffered,
	MOUNT,
	offered,
	REPLY,
	settle,
	stepTurn,
	textOf,
	untilGone,
	untilShown
} from "./testkit";

type Opts = NonNullable<Parameters<typeof offered>[3]>;

const fresh = (): Box => ({ text: "", filled: [], toasts: [], forks: 0 });

/** Shows an offer in turn t1; the first fork answers the check, later ones the recheck. */
const shown = async (
	$: Parameters<typeof offered>[0],
	on: Parameters<typeof offered>[1],
	opts: Opts
): Promise<{ box: Box; band: Band }> => {
	const box = fresh();
	const band = await offered($, on, box, opts);
	return { box, band };
};

test(
	"an offer later made untrue is cleared when the turn ends",
	MOUNT,
	async ($, on) => {
		// Arrange
		const { box, band } = await shown($, on, { replies: [REPLY, "DROP"] });

		// Act
		await completeTurn($, "t1");
		await untilGone(band, "Learn more");

		// Assert
		expect(box.forks).toBe(2);
		expect(await isOffered(band)).toBe(false);
	}
);

test("a DROP at a later check step clears the offer", MOUNT, async ($, on) => {
	// Arrange
	const { band } = await shown($, on, { replies: [REPLY, "DROP"] });

	// Act
	await stepTurn($, "t1", 12);
	await untilGone(band, "Learn more");

	// Assert
	expect(await isOffered(band)).toBe(false);
});

test("a KEEP leaves the offer up", MOUNT, async ($, on) => {
	// Arrange
	const { box, band } = await shown($, on, { replies: [REPLY, "KEEP"] });

	// Act
	await completeTurn($, "t1");
	await settle();

	// Assert
	expect(box.forks).toBe(2);
	expect(await isOffered(band)).toBe(true);
});

test("an unparseable answer leaves the offer up", MOUNT, async ($, on) => {
	// Arrange
	const { band } = await shown($, on, {
		replies: [REPLY, "I would drop it."]
	});

	// Act
	await completeTurn($, "t1");
	await settle();

	// Assert
	expect(await isOffered(band)).toBe(true);
});

test("a failing fork leaves the offer up", MOUNT, async ($, on) => {
	// Arrange
	const { box, band } = await shown($, on, { faults: true });

	// Act
	await completeTurn($, "t1");
	await settle();

	// Assert
	expect(box.forks).toBe(2);
	expect(await isOffered(band)).toBe(true);
});

test("an explained card is not rechecked", MOUNT, async ($, on) => {
	// Arrange
	const { box, band } = await shown($, on, { replies: [REPLY, "DROP"] });
	await band.press({ key: "Learn more" });
	await untilShown(band, "Understood");

	// Act
	await completeTurn($, "t1");
	await settle();

	// Assert
	expect(box.forks).toBe(1);
	expect(await band.find({ key: "Understood" })).toBeDefined();
});

test("a subagent's turn end does nothing", MOUNT, async ($, on) => {
	// Arrange
	const { box, band } = await shown($, on, { replies: [REPLY, "DROP"] });

	// Act
	await completeTurn($, "t1", "agent-1");
	await settle();

	// Assert
	expect(box.forks).toBe(1);
	expect(await isOffered(band)).toBe(true);
});

test("no recheck runs when no offer is up", MOUNT, async ($, on) => {
	// Arrange
	const { box } = await shown($, on, {
		replies: ["learn: none"],
		isOffer: false
	});

	// Act
	await completeTurn($, "t1");
	await settle();

	// Assert
	expect(box.forks).toBe(1);
});

test("a debug run shows that the offer was withdrawn", MOUNT, async ($, on) => {
	// Arrange
	const { band } = await shown($, on, {
		replies: [REPLY, "DROP"],
		env: { CLAUDE_CODE_YOU_SHOULD_KNOW_DEBUG: "1" }
	});

	// Act
	await completeTurn($, "t1");
	await untilGone(band, "Learn more");

	// Assert
	expect(await textOf(band)).toContain("withdrawn");
});
