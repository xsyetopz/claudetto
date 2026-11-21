import { expect, test } from "claude-code/testing";

import { type Box, MOUNT, offered, settle, viewKind } from "./testkit";

type Kept = Map<string, unknown>;

const LINE = "Tests run in order.";
const fresh = (): Box => ({ text: "", filled: [], toasts: [], forks: 0 });
const view = viewKind;

test(
	"three ignored offers skip the next eligible check, and the skip is used up",
	MOUNT,
	async ($, on) => {
		// Arrange
		const box = fresh();
		const kept: Kept = new Map<string, unknown>([["looksToSkip", 1]]);

		// Act
		await offered($, on, box, { kept, isOffer: false });

		// Assert
		expect(box.forks).toBe(0);
		expect(kept.get("looksToSkip")).toBe(0);
	}
);

test("an answer resets both backoff counters", MOUNT, async ($, on) => {
	// Arrange
	const kept: Kept = new Map<string, unknown>([["typedPastInARow", 4]]);
	const band = await offered($, on, fresh(), { kept });

	// Act
	await band.press({ key: "Knew this already" });
	await settle();

	// Assert
	expect(kept.get("typedPastInARow")).toBe(0);
	expect(kept.get("looksToSkip")).toBe(0);
});

test(
	"a proposed line equal to a seen line ignoring case and one full stop is not shown",
	MOUNT,
	async ($, on) => {
		// Arrange
		const box = fresh();
		const kept: Kept = new Map<string, unknown>([
			["seen", [LINE.toUpperCase().slice(0, -1)]]
		]);

		// Act
		await offered($, on, box, { kept, isOffer: false });

		// Assert
		expect(box.forks).toBe(1);
		expect(view(kept)).toBeUndefined();
	}
);

test(
	"a proposed line equal to a known line is not shown",
	MOUNT,
	async ($, on) => {
		// Arrange
		const box = fresh();
		const kept: Kept = new Map<string, unknown>([
			["known", [LINE.toLowerCase()]]
		]);

		// Act
		await offered($, on, box, { kept, isOffer: false });

		// Assert
		expect(box.forks).toBe(1);
		expect(view(kept)).toBeUndefined();
	}
);

test(
	"a shown line is kept as seen so it is not offered again",
	MOUNT,
	async ($, on) => {
		// Arrange
		const kept: Kept = new Map();

		// Act
		await offered($, on, fresh(), { kept });

		// Assert
		expect(kept.get("seen")).toEqual([LINE]);
	}
);
