import { expect, test } from "claude-code/testing";

import { ABOUT_THIS, APP_COPY, plainText, TERMINAL_COPY } from "../view/copy";
import { hasOwnComposer } from "../view/table";
import { type Box, offered, PLUGIN, PROPS, pause } from "./testkit";

type Node = { type?: string; props?: Record<string, unknown>; children?: unknown[] };

const walk = (node: unknown, visit: (n: Node) => void): void => {
	if (typeof node !== "object" || node === null) {
		return;
	}
	visit(node as Node);
	for (const child of (node as Node).children ?? []) {
		walk(child, visit);
	}
};

const buttons = (tree: unknown): Record<string, unknown>[] => {
	const found: Record<string, unknown>[] = [];
	walk(tree, (n) => {
		if (n.type === "Button") {
			found.push(n.props ?? {});
		}
	});
	return found;
};

const nodes = (tree: unknown, pred: (n: Node) => boolean): Node[] => {
	const found: Node[] = [];
	walk(tree, (n) => {
		if (pred(n)) {
			found.push(n);
		}
	});
	return found;
};

const fresh = (): Box => ({ text: "", filled: [], toasts: [], forks: 0 });

const waitFor = async (check: () => Promise<boolean>): Promise<void> => {
	for (let i = 0; i < 80 && !(await check()); i++) {
		await pause();
	}
};

test("terminal offer: lead, star column and five digit buttons in order", async ($, on) => {
	// Arrange
	const band = await offered($, on, fresh());

	// Act
	const tree = await band.drawn();

	// Assert
	expect(buttons(tree).map((b) => [b["key"], b["hotkey"], b["plain"]])).toEqual([
		["Learn more", "1", true],
		["Knew this already", "2", true],
		["What is this", "3", true],
		["Disable", "4", true],
		["Dismiss", "0", true],
	]);
	expect(buttons(tree).find((b) => b["key"] === "Dismiss")?.["role"]).toBe("dismiss");
	expect(nodes(tree, (n) => n.props?.["width"] === 2 && n.props?.["flexShrink"] === 0).length).toBe(1);
	expect(nodes(tree, (n) => n.type === "Text" && n.props?.["color"] === "suggestion")[0]?.children).toEqual(["✦"]);
	expect(nodes(tree, (n) => n.props?.["dimColor"] === true && JSON.stringify(n.children ?? "").includes("You should know")).length).toBe(1);
	expect(nodes(tree, (n) => n.props?.["flexDirection"] === "column" && n.props?.["marginTop"] === 1).length).toBe(1);
});

for (const surface of ["desktop", "vscode", "mobile"]) {
	test(`${surface}: buttons are click-only, with no Disable and no star column`, async ($, on) => {
		// Arrange
		const band = await offered($, on, fresh(), { surface });

		// Act
		const tree = await band.drawn();

		// Assert
		const found = buttons(tree);
		expect(found.map((b) => b["key"])).toEqual(["Learn more", "Knew this already", "What is this", "Dismiss"]);
		expect(found.some((b) => b["hotkey"] !== undefined || b["plain"] !== undefined)).toBe(false);
		expect(nodes(tree, (n) => n.props?.["width"] === 2 && n.props?.["flexShrink"] === 0).length).toBe(0);
	});
}

test("desktop: a hover card of width 60 holds the About copy and shows on hover only", async ($, on) => {
	// Arrange
	const band = await offered($, on, fresh(), { surface: "desktop" });

	// Act
	const cards = nodes(await band.drawn(), (n) => n.props?.["position"] === "absolute");

	// Assert
	expect(cards.length).toBe(1);
	expect(cards[0]?.props).toMatchObject({ bottom: 1, left: 0, display: "none", borderStyle: "round", borderDimColor: true, paddingX: 1, width: 60 });
	expect((cards[0] as { hover?: unknown }).hover).toEqual({ display: "flex" });
	expect(JSON.stringify(cards[0]?.children)).toContain("A side agent is watching your back while Claude works.");
	expect(JSON.stringify(cards[0]?.children)).not.toContain("/plugin disable");
});

test("desktop inks the star and tag subtle; vscode and mobile ink the star as a suggestion", async ($, on) => {
	// Arrange
	const desktop = await offered($, on, fresh(), { surface: "desktop" });

	// Act
	const subtle = nodes(await desktop.drawn(), (n) => n.props?.["color"] === "subtle");

	// Assert
	expect(subtle.length).toBe(2);
});

test("an external user sees no About button and no Disable button", async ($, on) => {
	// Arrange
	const band = await offered($, on, fresh(), { env: { USER_TYPE: "external" } });

	// Act
	const keys = buttons(await band.drawn()).map((b) => b["key"]);

	// Assert
	expect(keys).toEqual(["Learn more", "Knew this already", "Dismiss"]);
});

test("a narrow terminal that cannot hold the copy shows no About button", async ($, on) => {
	// Arrange
	const band = await offered($, on, fresh(), { props: { ...PROPS, maxRows: 1, bodyColumns: 100 } });

	// Act
	const keys = buttons(await band.drawn()).map((b) => b["key"]);

	// Assert
	expect(keys).not.toContain("What is this");
});

test("What is this swaps the body for the dim copy, Return to topic brings the topic back", async ($, on) => {
	// Arrange
	const band = await offered($, on, fresh());

	// Act
	await band.press({ key: "What is this" });
	await waitFor(async () => (await band.find({ key: "Return to topic" })) !== undefined);
	const about = JSON.stringify(await band.drawn());
	await band.press({ key: "Return to topic" });
	await waitFor(async () => (await band.find({ key: "What is this" })) !== undefined);
	const back = JSON.stringify(await band.drawn());

	// Assert
	expect(about).toContain("Disable on this machine with ");
	expect(about).not.toContain("Tests run in order.");
	expect(back).toContain("Tests run in order.");
});

test("a survey hides an offer but keeps an explained card, without buttons", async ($, on) => {
	// Arrange
	const band = await offered($, on, fresh());
	const survey = await $.ui.mount({ plugin: PLUGIN, surface: "terminal", component: "AbovePrompt", props: { ...PROPS, hasSurvey: true } });

	// Act
	const hidden = await survey.find({ key: "Learn more" });
	await band.press({ key: "Learn more" });
	await waitFor(async () => (await band.find({ key: "Understood" })) !== undefined);
	const explained = JSON.stringify(await survey.drawn());

	// Assert
	expect(hidden).toBeUndefined();
	expect(explained).toContain("They run one after another");
	expect(buttons(await survey.drawn())).toEqual([]);
});

test("Learn more with no shipped explanation forks, and an empty explanation shows the failure with OK", async ($, on) => {
	// Arrange
	const band = await offered($, on, fresh(), { replies: ["learn: Tests run in order.\ntag: You should know", "   "] });

	// Act
	await band.press({ key: "Learn more" });
	await waitFor(async () => (await band.find({ key: "OK" })) !== undefined);
	const failed = JSON.stringify(await band.drawn());
	await band.press({ key: "OK" });
	await waitFor(async () => (await band.find({ key: "OK" })) === undefined);

	// Assert
	expect(failed).toContain("Couldn’t write that explanation");
	expect(buttons(await band.drawn())).toEqual([]);
});

test("a reader of the explained card sees Understood, Chat in main session and Dismiss, and Dismiss asks again with 1, 2, 0", async ($, on) => {
	// Arrange
	const band = await offered($, on, fresh());
	await band.press({ key: "Learn more" });
	await waitFor(async () => (await band.find({ key: "Understood" })) !== undefined);

	// Act
	const explained = buttons(await band.drawn()).map((b) => [b["hotkey"], b["key"]]);
	await band.press({ key: "Dismiss" });
	await waitFor(async () => (await band.find({ key: "Didn’t understand" })) !== undefined);
	const asked = buttons(await band.drawn()).map((b) => [b["hotkey"], b["key"]]);

	// Assert
	expect(explained).toEqual([["1", "Understood"], ["2", "Chat in main session"], ["0", "Dismiss"]]);
	expect(asked).toEqual([["1", "That was helpful"], ["2", "Didn’t understand"], ["0", "Dismiss"]]);
});

test("Dismiss on an offer asks with five buttons and Turn off suggestions on the terminal", async ($, on) => {
	// Arrange
	const band = await offered($, on, fresh());

	// Act
	await band.press({ key: "Dismiss" });
	await waitFor(async () => (await band.find({ key: "Not relevant" })) !== undefined);
	const asked = buttons(await band.drawn()).map((b) => [b["hotkey"], b["key"]]);

	// Assert
	expect(asked).toEqual([
		["1", "That was helpful"],
		["2", "Not relevant"],
		["3", "Couldn’t understand"],
		["4", "Turn off suggestions"],
		["0", "Dismiss"],
	]);
	expect(JSON.stringify(await band.drawn())).toContain("Dismissed.");
});

test("an unknown surface counts as one with its own composer; only the terminal has none", () => {
	// Arrange
	const surfaces = ["terminal", "desktop", "mobile", "vscode", "somewhere-new"];

	// Act
	const own = surfaces.map(hasOwnComposer);

	// Assert
	expect(own).toEqual([false, true, true, true, true]);
});

const INKS = {
	vscode: { star: "suggestion", tagDim: true, tagColor: undefined },
	mobile: { star: "suggestion", tagDim: true, tagColor: undefined },
	desktop: { star: "subtle", tagDim: undefined, tagColor: "subtle" },
} as const;

for (const surface of ["vscode", "mobile", "desktop"] as const) {
	test(`${surface} draws the lead with its star and tag inks (REQ-015)`, async ($, on) => {
		// Arrange
		const tree = await (await offered($, on, fresh(), { surface })).drawn();

		// Act
		const star = nodes(tree, (n) => n.type === "Text" && JSON.stringify(n.children) === '["✦"]')[0]?.props?.["color"];
		const tag = nodes(tree, (n) => n.type === "Text" && JSON.stringify(n.children ?? "").includes("You should know") && n.children?.length === 3)[0];

		// Assert
		expect({ star, tagDim: tag?.props?.["dimColor"], tagColor: tag?.props?.["color"] }).toEqual(INKS[surface]);
	});
}

test("the terminal row wraps its body beside the star column (REQ-016)", async ($, on) => {
	// Arrange
	const tree = await (await offered($, on, fresh())).drawn();

	// Act
	const row = nodes(tree, (n) => n.props?.["flexDirection"] === "row" && n.props?.["alignItems"] === "flex-start")[0];

	// Assert
	expect(row?.children?.length).toBe(2);
	expect((row?.children?.[0] as Node).props).toMatchObject({ width: 2, flexShrink: 0 });
	expect((row?.children?.[1] as Node).props).toMatchObject({ wrap: "wrap" });
});

test("the desktop row has a left cell with the hover card and a body (REQ-016)", async ($, on) => {
	// Arrange
	const tree = await (await offered($, on, fresh(), { surface: "desktop" })).drawn();

	// Act
	const row = nodes(tree, (n) => n.props?.["flexDirection"] === "row" && n.props?.["alignItems"] === "flex-start")[0];

	// Assert
	expect((row?.children?.[0] as Node).props).toMatchObject({ flexShrink: 0 });
	expect(JSON.stringify((row?.children?.[0] as Node).children)).toContain("A side agent is watching");
	expect(JSON.stringify(row?.children?.[1])).toContain("Tests run in order.");
});

test("the About copy is three lines in the app card and four, ending with the disable command, on the terminal (REQ-012)", () => {
	// Assert
	expect(APP_COPY.map((para) => plainText([para]))).toEqual([
		"A side agent is watching your back while Claude works.",
		"When something comes up that you should know but might miss, this plugin flags it for you.",
		"Learn more to get a deeper explanation and chat about it.",
	]);
	expect(TERMINAL_COPY.map((para) => plainText([para])).slice(0, 3)).toEqual(APP_COPY.map((para) => plainText([para])));
	expect(plainText([TERMINAL_COPY[3] as never])).toBe("Disable on this machine with /plugin disable claudetto-you-should-know.");
	expect(TERMINAL_COPY).toHaveLength(4);
	expect(ABOUT_THIS).toContain("/plugin disable claudetto-you-should-know");
});

test("Learn more with no shipped explanation runs a fork and shows its result, and the button stays on the offer (REQ-039)", async ($, on) => {
	// Arrange
	const box = fresh();
	const band = await offered($, on, box, { replies: ["learn: Tests run in order.\ntag: You should know", "**Order matters**\nSteps run one after another."] });
	const before = await band.find({ key: "Learn more" });

	// Act
	await band.press({ key: "Learn more" });
	await waitFor(async () => (await band.find({ key: "Understood" })) !== undefined);

	// Assert
	expect(before).toBeDefined();
	expect(box.forks).toBe(2);
	expect(JSON.stringify(await band.drawn())).toContain("Steps run one after another.");
});

test("Dismiss on an offer asks without Turn off suggestions on a surface with its own composer (REQ-043)", async ($, on) => {
	// Arrange
	const band = await offered($, on, fresh(), { surface: "desktop" });

	// Act
	await band.press({ key: "Dismiss" });
	await waitFor(async () => (await band.find({ key: "Not relevant" })) !== undefined);
	const keys = buttons(await band.drawn()).map((b) => b["key"]);

	// Assert
	expect(keys).toEqual(["That was helpful", "Not relevant", "Couldn’t understand", "Dismiss"]);
});
