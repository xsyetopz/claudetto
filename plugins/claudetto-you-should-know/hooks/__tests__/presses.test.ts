import { expect, test } from "claude-code/testing";

import { RESPOND_BOX_BUSY, RESPOND_NOT_FILLED } from "../view/draft";
import { type Box, type Offer, offered, pause } from "./testkit";

type Row = { id: string; view?: { kind: string } };
type Kept = Map<string, unknown>;

const LINE = "Tests run in order.";
const fresh = (): Box => ({ text: "", filled: [], toasts: [], forks: 0 });
const view = (kept: Kept): string | undefined =>
	((kept.get("sessions") ?? []) as Row[]).find((r) => r.id === "s1")?.view?.kind;

const settle = async (): Promise<void> => {
	for (let i = 0; i < 10; i++) {
		await pause();
	}
};

const waitFor = async (check: () => Promise<boolean> | boolean): Promise<void> => {
	for (let i = 0; i < 80 && !(await check()); i++) {
		await pause();
	}
};

type Band = Awaited<ReturnType<typeof offered>>;

const pressed = async (band: Band, key: string, next: string): Promise<void> => {
	await band.press({ key });
	await waitFor(async () => (await band.find({ key: next })) !== undefined);
};

/** An offer whose card is open, ready for Understood, Chat in main session or Dismiss. */
const explained = async ($: Parameters<typeof offered>[0], on: Parameters<typeof offered>[1], box: Box, kept: Kept, extra: Offer = {}) => {
	const band = await offered($, on, box, { kept, ...extra });
	await pressed(band, "Learn more", "Understood");
	return band;
};

test("Knew this already marks the line known and clears without a toast", async ($, on) => {
	// Arrange
	const box = fresh();
	const kept: Kept = new Map();
	const band = await offered($, on, box, { kept });

	// Act
	await band.press({ key: "Knew this already" });
	await settle();

	// Assert
	expect(kept.get("known")).toEqual([LINE]);
	expect(view(kept)).toBeUndefined();
	expect(box.toasts).toEqual([]);
});

test("That was helpful marks the line known", async ($, on) => {
	// Arrange
	const kept: Kept = new Map();
	const band = await offered($, on, fresh(), { kept });
	await pressed(band, "Dismiss", "That was helpful");

	// Act
	await band.press({ key: "That was helpful" });
	await settle();

	// Assert
	expect(kept.get("known")).toEqual([LINE]);
	expect(view(kept)).toBeUndefined();
});

for (const key of ["Not relevant", "Couldn’t understand"]) {
	test(`${key} clears the row and leaves the known list alone`, async ($, on) => {
		// Arrange
		const kept: Kept = new Map();
		const band = await offered($, on, fresh(), { kept });
		await pressed(band, "Dismiss", key);

		// Act
		await band.press({ key });
		await settle();

		// Assert
		expect(kept.get("known")).toBeUndefined();
		expect(view(kept)).toBeUndefined();
	});
}

test("Understood marks the line known and clears the card", async ($, on) => {
	// Arrange
	const kept: Kept = new Map();
	const band = await explained($, on, fresh(), kept);

	// Act
	await band.press({ key: "Understood" });
	await settle();

	// Assert
	expect(kept.get("known")).toEqual([LINE]);
	expect(view(kept)).toBeUndefined();
});

test("Dismiss on an offer shows the asked row that clears by itself after 20 seconds", async ($, on) => {
	// Arrange
	const box = fresh();
	const kept: Kept = new Map();
	const band = await offered($, on, box, { kept });
	await pressed(band, "Dismiss", "Not relevant");
	const shown = view(kept);

	// Act
	await box.clock?.advance(19_000);
	await settle();
	const before = view(kept);
	await box.clock?.advance(1_000);
	await settle();

	// Assert
	expect(shown).toBe("asked");
	expect(before).toBe("asked");
	expect(view(kept)).toBeUndefined();
});

test("a press on the asked row answers once even when pressed twice", async ($, on) => {
	// Arrange
	const kept: Kept = new Map();
	const band = await offered($, on, fresh(), { kept });
	await pressed(band, "Dismiss", "That was helpful");
	const press = band.press({ key: "That was helpful" });

	// Act
	await press;
	await band.press({ key: "That was helpful" }).catch(() => undefined);
	await settle();

	// Assert
	expect(kept.get("known")).toEqual([LINE]);
});

test("Chat in main session fills the box with the draft and a blank line, then clears the card", async ($, on) => {
	// Arrange
	const box = fresh();
	const kept: Kept = new Map();
	const band = await explained($, on, box, kept);

	// Act
	await band.press({ key: "Chat in main session" });
	await waitFor(() => box.filled.length > 0);
	await settle();

	// Assert
	expect(box.filled).toHaveLength(1);
	expect(box.filled[0]?.endsWith("\n\n")).toBe(true);
	expect(box.filled[0]).toContain(LINE);
	expect(kept.get("known")).toEqual([LINE]);
	expect(view(kept)).toBeUndefined();
});

test("Chat with text in the box toasts that the box is busy and keeps the card", async ($, on) => {
	// Arrange
	const box = { ...fresh(), text: "half a thought" };
	const kept: Kept = new Map();
	const band = await explained($, on, box, kept);

	// Act
	await band.press({ key: "Chat in main session" });
	await waitFor(() => box.toasts.length > 0);
	await settle();

	// Assert
	expect(box.toasts).toEqual([RESPOND_BOX_BUSY]);
	expect(box.filled).toEqual([]);
	expect(view(kept)).toBe("explained");
});

test("Chat refused by the box toasts the not-filled text and keeps the card", async ($, on) => {
	// Arrange
	const box = fresh();
	const kept: Kept = new Map();
	const band = await explained($, on, box, kept, { refuse: true });

	// Act
	await band.press({ key: "Chat in main session" });
	await waitFor(() => box.toasts.length > 0);
	await settle();

	// Assert
	expect(box.toasts).toEqual([RESPOND_NOT_FILLED]);
	expect(view(kept)).toBe("explained");
});
