import { expect, test } from "claude-code/testing";

import { type Box, MOUNT, offered, PROPS } from "./testkit";
import { buttons, childAt, nodes } from "./tree";

const fresh = (): Box => ({ text: "", filled: [], toasts: [], forks: 0 });

test(
	"terminal offer: lead, star column and five digit buttons in order",
	MOUNT,
	async ($, on) => {
		// Arrange
		const band = await offered($, on, fresh());

		// Act
		const tree = await band.drawn();

		// Assert
		expect(
			buttons(tree).map((b) => [b["key"], b["hotkey"], b["plain"]])
		).toEqual([
			["Learn more", "1", true],
			["Knew this already", "2", true],
			["What is this", "3", true],
			["Disable", "4", true],
			["Dismiss", "0", true]
		]);
		expect(buttons(tree).find((b) => b["key"] === "Dismiss")?.["role"]).toBe(
			"dismiss"
		);
		expect(
			nodes(
				tree,
				(n) => n.props?.["width"] === 2 && n.props?.["flexShrink"] === 0
			).length
		).toBe(1);
		expect(
			nodes(
				tree,
				(n) => n.type === "Text" && n.props?.["color"] === "suggestion"
			)[0]?.children
		).toEqual(["✦"]);
		expect(
			nodes(
				tree,
				(n) =>
					n.props?.["dimColor"] === true &&
					JSON.stringify(n.children ?? "").includes("You should know")
			).length
		).toBe(1);
		expect(
			nodes(
				tree,
				(n) =>
					n.props?.["flexDirection"] === "column" &&
					n.props?.["marginTop"] === 1
			).length
		).toBe(1);
	}
);

for (const surface of ["desktop", "vscode", "mobile"] as const) {
	test(
		`${surface}: buttons are click-only, with no Disable and no star column`,
		MOUNT,
		async ($, on) => {
			// Arrange
			const band = await offered($, on, fresh(), { surface });

			// Act
			const tree = await band.drawn();

			// Assert
			const found = buttons(tree);
			expect(found.map((b) => b["key"])).toEqual([
				"Learn more",
				"Knew this already",
				"What is this",
				"Dismiss"
			]);
			expect(
				found.some((b) => b["hotkey"] !== undefined || b["plain"] !== undefined)
			).toBe(false);
			expect(
				nodes(
					tree,
					(n) => n.props?.["width"] === 2 && n.props?.["flexShrink"] === 0
				).length
			).toBe(0);
		}
	);
}

test(
	"desktop: a hover card of width 60 holds the About copy and shows on hover only",
	MOUNT,
	async ($, on) => {
		// Arrange
		const band = await offered($, on, fresh(), { surface: "desktop" });

		// Act
		const cards = nodes(
			await band.drawn(),
			(n) => n.props?.["position"] === "absolute"
		);

		// Assert
		expect(cards.length).toBe(1);
		expect(cards[0]?.props).toMatchObject({
			bottom: 1,
			left: 0,
			display: "none",
			borderStyle: "round",
			borderDimColor: true,
			paddingX: 1,
			width: 60
		});
		expect(cards[0]?.hover).toEqual({
			display: "flex"
		});
		expect(JSON.stringify(cards[0]?.children)).toContain(
			"A side agent is watching your back while Claude works."
		);
		expect(JSON.stringify(cards[0]?.children)).not.toContain("/plugin disable");
	}
);

test(
	"desktop inks the star and tag subtle; vscode and mobile ink the star as a suggestion",
	MOUNT,
	async ($, on) => {
		// Arrange
		const desktop = await offered($, on, fresh(), { surface: "desktop" });

		// Act
		const subtle = nodes(
			await desktop.drawn(),
			(n) => n.props?.["color"] === "subtle"
		);

		// Assert
		expect(subtle.length).toBe(2);
	}
);

test(
	"an external user sees no About button and no Disable button",
	MOUNT,
	async ($, on) => {
		// Arrange
		const band = await offered($, on, fresh(), {
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
		const band = await offered($, on, fresh(), {
			props: { ...PROPS, maxRows: 1, bodyColumns: 100 }
		});

		// Act
		const keys = buttons(await band.drawn()).map((b) => b["key"]);

		// Assert
		expect(keys).not.toContain("What is this");
	}
);

const INKS = {
	vscode: { star: "suggestion", tagDim: true, tagColor: undefined },
	mobile: { star: "suggestion", tagDim: true, tagColor: undefined },
	desktop: { star: "subtle", tagDim: undefined, tagColor: "subtle" }
} as const;

for (const surface of ["vscode", "mobile", "desktop"] as const) {
	test(
		`${surface} draws the lead with its star and tag inks (REQ-015)`,
		MOUNT,
		async ($, on) => {
			// Arrange
			const band = await offered($, on, fresh(), { surface });
			const tree = await band.drawn();

			// Act
			const star = nodes(
				tree,
				(n) => n.type === "Text" && JSON.stringify(n.children) === '["✦"]'
			)[0]?.props?.["color"];
			const tag = nodes(
				tree,
				(n) =>
					n.type === "Text" &&
					JSON.stringify(n.children ?? "").includes("You should know") &&
					n.children?.length === 3
			)[0];

			// Assert
			expect({
				star,
				tagDim: tag?.props?.["dimColor"],
				tagColor: tag?.props?.["color"]
			}).toEqual(INKS[surface]);
		}
	);
}

test(
	"the terminal row wraps its body beside the star column (REQ-016)",
	MOUNT,
	async ($, on) => {
		// Arrange
		const band = await offered($, on, fresh());
		const tree = await band.drawn();

		// Act
		const row = nodes(
			tree,
			(n) =>
				n.props?.["flexDirection"] === "row" &&
				n.props?.["alignItems"] === "flex-start"
		)[0];

		// Assert
		expect(row?.children?.length).toBe(2);
		expect(childAt(row, 0)?.props).toMatchObject({
			width: 2,
			flexShrink: 0
		});
		expect(childAt(row, 1)?.props).toMatchObject({ wrap: "wrap" });
	}
);

test(
	"the desktop row has a left cell with the hover card and a body (REQ-016)",
	MOUNT,
	async ($, on) => {
		// Arrange
		const band = await offered($, on, fresh(), { surface: "desktop" });
		const tree = await band.drawn();

		// Act
		const row = nodes(
			tree,
			(n) =>
				n.props?.["flexDirection"] === "row" &&
				n.props?.["alignItems"] === "flex-start"
		)[0];

		// Assert
		expect(childAt(row, 0)?.props).toMatchObject({ flexShrink: 0 });
		expect(JSON.stringify(childAt(row, 0)?.children)).toContain(
			"A side agent is watching"
		);
		expect(JSON.stringify(row?.children?.[1])).toContain("Tests run in order.");
	}
);
