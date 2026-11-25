import { expect, test } from "claude-code/testing";

import {
	type Band,
	type Box,
	checkIn,
	freshBox,
	isOffered,
	MOUNT,
	type Offer,
	offered,
	settle,
	textOf,
	until
} from "./testkit";

const LINE = "Tests run in order.";

const waitFor = (check: () => Promise<boolean> | boolean): Promise<void> =>
	until(check, 80);

const pressed = async (
	band: Band,
	key: string,
	next: string
): Promise<void> => {
	await band.press({ key });
	await waitFor(async () => (await band.find({ key: next })) !== undefined);
};

/** An offer whose card is open, ready for Understood, Chat in main session or Dismiss. */
const explained = async (
	$: Parameters<typeof offered>[0],
	on: Parameters<typeof offered>[1],
	box: Box,
	extra: Offer = {}
) => {
	const band = await offered($, on, box, extra);
	await pressed(band, "Learn more", "Understood");
	return band;
};

/** True when a later check proposing the same line draws no offer, because the line is known. */
const staysAway = async (
	$: Parameters<typeof offered>[0],
	box: Box,
	band: Band
): Promise<boolean> => {
	const before = box.forks;
	await checkIn($, "t2");
	return box.forks === before + 1 && !(await isOffered(band));
};

test(
	"Knew this already clears the offer without a toast and the line does not come back",
	MOUNT,
	async ($, on) => {
		// Arrange
		const box = freshBox();
		const band = await offered($, on, box);

		// Act
		await band.press({ key: "Knew this already" });
		await settle();

		// Assert
		expect(await isOffered(band)).toBe(false);
		expect(box.toasts).toEqual([]);
		expect(await staysAway($, box, band)).toBe(true);
	}
);

test(
	"That was helpful clears the asked row and the line does not come back",
	MOUNT,
	async ($, on) => {
		// Arrange
		const box = freshBox();
		const band = await offered($, on, box);
		await pressed(band, "Dismiss", "That was helpful");

		// Act
		await band.press({ key: "That was helpful" });
		await settle();

		// Assert
		expect(await band.find({ key: "That was helpful" })).toBeUndefined();
		expect(await staysAway($, box, band)).toBe(true);
	}
);

for (const key of ["Not relevant", "Couldn’t understand"]) {
	test(`${key} clears the asked row`, MOUNT, async ($, on) => {
		// Arrange
		const band = await offered($, on, freshBox());
		await pressed(band, "Dismiss", key);

		// Act
		await band.press({ key });
		await settle();

		// Assert
		expect(await band.find({ key })).toBeUndefined();
		expect(await isOffered(band)).toBe(false);
	});
}

test(
	"Understood clears the card and the line does not come back",
	MOUNT,
	async ($, on) => {
		// Arrange
		const box = freshBox();
		const band = await explained($, on, box);

		// Act
		await band.press({ key: "Understood" });
		await settle();

		// Assert
		expect(await band.find({ key: "Understood" })).toBeUndefined();
		expect(await staysAway($, box, band)).toBe(true);
	}
);

test(
	"Dismiss on an offer shows the asked row that clears by itself after 20 seconds",
	MOUNT,
	async ($, on) => {
		// Arrange
		const box = freshBox();
		const band = await offered($, on, box);
		await pressed(band, "Dismiss", "Not relevant");

		// Act
		await box.clock?.advance(19_000);
		await settle();
		const before = await band.find({ key: "Not relevant" });
		await box.clock?.advance(1000);
		await settle();

		// Assert
		expect(before).toBeDefined();
		expect(await band.find({ key: "Not relevant" })).toBeUndefined();
	}
);

test(
	"a second press on the asked row changes nothing more",
	MOUNT,
	async ($, on) => {
		// Arrange
		const box = freshBox();
		const band = await offered($, on, box);
		await pressed(band, "Dismiss", "That was helpful");
		await band.press({ key: "That was helpful" });

		// Act
		await band.press({ key: "That was helpful" }).catch(() => {
			// the second press may be refused once the row has answered
		});
		await settle();

		// Assert
		expect(box.toasts).toEqual([]);
		expect(await staysAway($, box, band)).toBe(true);
	}
);

test(
	"Chat in main session fills the box with the draft and a blank line, then clears the card",
	MOUNT,
	async ($, on) => {
		// Arrange
		const box = freshBox();
		const band = await explained($, on, box);

		// Act
		await band.press({ key: "Chat in main session" });
		await waitFor(() => box.filled.length > 0);
		await settle();

		// Assert
		expect(box.filled).toHaveLength(1);
		expect(box.filled[0]?.endsWith("\n\n")).toBe(true);
		expect(box.filled[0]).toContain(LINE);
		expect(await band.find({ key: "Understood" })).toBeUndefined();
		expect(await staysAway($, box, band)).toBe(true);
	}
);

test(
	"the Chat draft quotes every line and defuses mentions, placeholders and directive words",
	MOUNT,
	async ($, on) => {
		// Arrange
		const box = freshBox();
		const band = await explained($, on, box, {
			replies: [
				`learn: ${LINE}\ntag: Heads up\nexplain: **Order**\nAsk @alice about [Image #2], then ultrathink.`
			]
		});

		// Act
		await band.press({ key: "Chat in main session" });
		await waitFor(() => box.filled.length > 0);
		const draft = box.filled[0] ?? "";
		const quoted = draft
			.slice(
				draft.indexOf("<side_agent_note>\n") + "<side_agent_note>\n".length,
				draft.indexOf("\n</side_agent_note>")
			)
			.split("\n");

		// Assert
		expect(quoted.length).toBeGreaterThan(1);
		expect(quoted.every((l) => l === ">" || l.startsWith("> "))).toBe(true);
		expect(draft).toContain("＠alice");
		expect(draft).toContain("［Image #2]");
		expect(draft).toContain("ultra-think");
		expect(draft).not.toContain("@alice");
		expect(draft).not.toContain("[Image #2]");
	}
);

test(
	"Chat with text in the box toasts once and keeps the card",
	MOUNT,
	async ($, on) => {
		// Arrange
		const box = { ...freshBox(), text: "half a thought" };
		const band = await explained($, on, box);

		// Act
		await band.press({ key: "Chat in main session" });
		await waitFor(() => box.toasts.length > 0);
		await settle();

		// Assert
		expect(box.toasts).toHaveLength(1);
		expect(box.filled).toEqual([]);
		expect(await band.find({ key: "Understood" })).toBeDefined();
	}
);

test(
	"Chat refused by the box toasts once and keeps the card",
	MOUNT,
	async ($, on) => {
		// Arrange
		const box = freshBox();
		const band = await explained($, on, box, { refuse: true });

		// Act
		await band.press({ key: "Chat in main session" });
		await waitFor(() => box.toasts.length > 0);
		await settle();

		// Assert
		expect(box.toasts).toHaveLength(1);
		expect(await band.find({ key: "Understood" })).toBeDefined();
		expect(await textOf(band)).toContain(LINE);
	}
);
