import { expect, test } from "claude-code/testing";

import { freshBox, MOUNT, offered, PROPS, textOf } from "./testkit";
import { buttons } from "./tree";

test(
	"terminal offer: the line, the star and five digit buttons in order",
	MOUNT,
	async ($, on) => {
		// Arrange
		const band = await offered($, on, freshBox());

		// Act
		const tree = await band.drawn();
		const drawn = await textOf(band);

		// Assert
		expect(buttons(tree).map((b) => [b["key"], b["hotkey"]])).toEqual([
			["Learn more", "1"],
			["Knew this already", "2"],
			["What is this", "3"],
			["Disable", "4"],
			["Dismiss", "0"]
		]);
		expect(drawn).toContain("✦");
		expect(drawn).toContain("You should know");
		expect(drawn).toContain("Tests run in order.");
	}
);

for (const surface of ["desktop", "vscode", "mobile"] as const) {
	test(
		`${surface}: buttons are click-only, with no Disable`,
		MOUNT,
		async ($, on) => {
			// Arrange
			const band = await offered($, on, freshBox(), { surface });

			// Act
			const found = buttons(await band.drawn());

			// Assert
			expect(found.map((b) => b["key"])).toEqual([
				"Learn more",
				"Knew this already",
				"What is this",
				"Dismiss"
			]);
			expect(found.some((b) => b["hotkey"] !== undefined)).toBe(false);
		}
	);
}

test(
	"desktop: the About copy sits in the band for a hover and does not name the disable command",
	MOUNT,
	async ($, on) => {
		// Arrange
		const band = await offered($, on, freshBox(), { surface: "desktop" });

		// Act
		const drawn = await textOf(band);

		// Assert
		expect(drawn).toContain("side agent");
		expect(drawn).toContain("Tests run in order.");
		expect(drawn).not.toContain("/plugin disable");
	}
);

test(
	"an external user sees no About button and no Disable button",
	MOUNT,
	async ($, on) => {
		// Arrange
		const band = await offered($, on, freshBox(), {
			env: { USER_TYPE: "external" }
		});

		// Act
		const keys = buttons(await band.drawn()).map((b) => b["key"]);

		// Assert
		expect(keys).toEqual(["Learn more", "Knew this already", "Dismiss"]);
	}
);

test(
	"a narrow terminal that cannot hold the copy shows no About button",
	MOUNT,
	async ($, on) => {
		// Arrange
		const band = await offered($, on, freshBox(), {
			props: { ...PROPS, maxRows: 1, bodyColumns: 100 }
		});

		// Act
		const keys = buttons(await band.drawn()).map((b) => b["key"]);

		// Assert
		expect(keys).not.toContain("What is this");
	}
);
