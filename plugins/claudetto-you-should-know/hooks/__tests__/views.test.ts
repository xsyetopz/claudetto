import { expect, test } from "claude-code/testing";

import { ABOUT_THIS, APP_COPY, plainText, TERMINAL_COPY } from "../view/copy";
import { hasOwnComposer } from "../view/table";
import { type Box, MOUNT, offered, PLUGIN, PROPS, until } from "./testkit";
import { buttons } from "./tree";

const fresh = (): Box => ({ text: "", filled: [], toasts: [], forks: 0 });

const waitFor = (check: () => Promise<boolean>): Promise<void> =>
	until(check, 80);

test(
	"What is this swaps the body for the dim copy, Return to topic brings the topic back",
	MOUNT,
	async ($, on) => {
		// Arrange
		const band = await offered($, on, fresh());

		// Act
		await band.press({ key: "What is this" });
		await waitFor(
			async () => (await band.find({ key: "Return to topic" })) !== undefined
		);
		const about = JSON.stringify(await band.drawn());
		await band.press({ key: "Return to topic" });
		await waitFor(
			async () => (await band.find({ key: "What is this" })) !== undefined
		);
		const back = JSON.stringify(await band.drawn());

		// Assert
		expect(about).toContain("Disable on this machine with ");
		expect(about).not.toContain("Tests run in order.");
		expect(back).toContain("Tests run in order.");
	}
);

test(
	"a survey hides an offer but keeps an explained card, without buttons",
	MOUNT,
	async ($, on) => {
		// Arrange
		const band = await offered($, on, fresh());
		const survey = await $.ui.mount({
			plugin: PLUGIN,
			surface: "terminal",
			component: "AbovePrompt",
			props: { ...PROPS, hasSurvey: true }
		});

		// Act
		const hidden = await survey.find({ key: "Learn more" });
		await band.press({ key: "Learn more" });
		await waitFor(
			async () => (await band.find({ key: "Understood" })) !== undefined
		);
		const explained = JSON.stringify(await survey.drawn());

		// Assert
		expect(hidden).toBeUndefined();
		expect(explained).toContain("They run one after another");
		expect(buttons(await survey.drawn())).toEqual([]);
	}
);

test(
	"Learn more with no shipped explanation forks, and an empty explanation shows the failure with OK",
	MOUNT,
	async ($, on) => {
		// Arrange
		const band = await offered($, on, fresh(), {
			replies: ["learn: Tests run in order.\ntag: You should know", "   "]
		});

		// Act
		await band.press({ key: "Learn more" });
		await waitFor(async () => (await band.find({ key: "OK" })) !== undefined);
		const failed = JSON.stringify(await band.drawn());
		await band.press({ key: "OK" });
		await waitFor(async () => (await band.find({ key: "OK" })) === undefined);

		// Assert
		expect(failed).toContain("Couldn’t write that explanation");
		expect(buttons(await band.drawn())).toEqual([]);
	}
);

test(
	"a reader of the explained card sees Understood, Chat in main session and Dismiss, and Dismiss asks again with 1, 2, 0",
	MOUNT,
	async ($, on) => {
		// Arrange
		const band = await offered($, on, fresh());
		await band.press({ key: "Learn more" });
		await waitFor(
			async () => (await band.find({ key: "Understood" })) !== undefined
		);

		// Act
		const explained = buttons(await band.drawn()).map((b) => [
			b["hotkey"],
			b["key"]
		]);
		await band.press({ key: "Dismiss" });
		await waitFor(
			async () => (await band.find({ key: "Didn’t understand" })) !== undefined
		);
		const asked = buttons(await band.drawn()).map((b) => [
			b["hotkey"],
			b["key"]
		]);

		// Assert
		expect(explained).toEqual([
			["1", "Understood"],
			["2", "Chat in main session"],
			["0", "Dismiss"]
		]);
		expect(asked).toEqual([
			["1", "That was helpful"],
			["2", "Didn’t understand"],
			["0", "Dismiss"]
		]);
	}
);

test(
	"Dismiss on an offer asks with five buttons and Turn off suggestions on the terminal",
	MOUNT,
	async ($, on) => {
		// Arrange
		const band = await offered($, on, fresh());

		// Act
		await band.press({ key: "Dismiss" });
		await waitFor(
			async () => (await band.find({ key: "Not relevant" })) !== undefined
		);
		const asked = buttons(await band.drawn()).map((b) => [
			b["hotkey"],
			b["key"]
		]);

		// Assert
		expect(asked).toEqual([
			["1", "That was helpful"],
			["2", "Not relevant"],
			["3", "Couldn’t understand"],
			["4", "Turn off suggestions"],
			["0", "Dismiss"]
		]);
		expect(JSON.stringify(await band.drawn())).toContain("Dismissed.");
	}
);

test(
	"Learn more with no shipped explanation runs a fork and shows its result, and the button stays on the offer (REQ-039)",
	MOUNT,
	async ($, on) => {
		// Arrange
		const box = fresh();
		const band = await offered($, on, box, {
			replies: [
				"learn: Tests run in order.\ntag: You should know",
				"**Order matters**\nSteps run one after another."
			]
		});
		const before = await band.find({ key: "Learn more" });

		// Act
		await band.press({ key: "Learn more" });
		await waitFor(
			async () => (await band.find({ key: "Understood" })) !== undefined
		);

		// Assert
		expect(before).toBeDefined();
		expect(box.forks).toBe(2);
		expect(JSON.stringify(await band.drawn())).toContain(
			"Steps run one after another."
		);
	}
);

test(
	"Dismiss on an offer asks without Turn off suggestions on a surface with its own composer (REQ-043)",
	MOUNT,
	async ($, on) => {
		// Arrange
		const band = await offered($, on, fresh(), { surface: "desktop" });

		// Act
		await band.press({ key: "Dismiss" });
		await waitFor(
			async () => (await band.find({ key: "Not relevant" })) !== undefined
		);
		const keys = buttons(await band.drawn()).map((b) => b["key"]);

		// Assert
		expect(keys).toEqual([
			"That was helpful",
			"Not relevant",
			"Couldn’t understand",
			"Dismiss"
		]);
	}
);

test("an unknown surface counts as one with its own composer; only the terminal has none", () => {
	// Arrange
	const surfaces = ["terminal", "desktop", "mobile", "vscode", "somewhere-new"];

	// Act
	const own = surfaces.map((name) => hasOwnComposer(name));

	// Assert
	expect(own).toEqual([false, true, true, true, true]);
});

test("the About copy is three lines in the app card and four, ending with the disable command, on the terminal (REQ-012)", () => {
	// Assert
	expect(APP_COPY.map((para) => plainText([para]))).toEqual([
		"A side agent is watching your back while Claude works.",
		"When something comes up that you should know but might miss, this plugin flags it for you.",
		"Learn more to get a deeper explanation and chat about it."
	]);
	expect(TERMINAL_COPY.map((para) => plainText([para])).slice(0, 3)).toEqual(
		APP_COPY.map((para) => plainText([para]))
	);
	expect(plainText(TERMINAL_COPY.slice(3))).toBe(
		"Disable on this machine with /plugin disable claudetto-you-should-know."
	);
	expect(TERMINAL_COPY).toHaveLength(4);
	expect(ABOUT_THIS).toContain("/plugin disable claudetto-you-should-know");
});
