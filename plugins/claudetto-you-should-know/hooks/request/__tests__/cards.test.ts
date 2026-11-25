import { expect, test } from "claude-code/testing";

import {
	type Band,
	freshBox,
	MOUNT,
	offered,
	PLUGIN,
	PROPS,
	textOf,
	untilShown
} from "../../__tests__/testkit";

const WIDE = "W".repeat(150);
const REPLY = `learn: Tests run in order.\ntag: You should know\nexplain: **Order**\nThey run one after another.\n\`\`\`\nA -> B\n${WIDE}\n\`\`\`\nCaption here`;

/** Shows the offer for `reply` and opens its explanation card. */
const open = async (
	$: Parameters<typeof offered>[0],
	on: Parameters<typeof offered>[1],
	reply: string,
	props?: object
): Promise<Band> => {
	const band = await offered($, on, freshBox(), {
		replies: [reply],
		props: { ...PROPS, ...props }
	});
	await band.press({ key: "Learn more" });
	await untilShown(band, "Understood", 80);
	return band;
};

test(
	"an explained card with a sketch draws the sketch lines in a code block",
	MOUNT,
	async ($, on) => {
		// Arrange
		const band = await open($, on, REPLY);

		// Act
		const drawn = await textOf(band);

		// Assert
		expect(drawn).toContain("Code");
		expect(drawn).toContain("A -> B");
		expect(drawn).toContain("Caption here");
	}
);

test(
	"a sketch line wider than the body ends in an ellipsis",
	MOUNT,
	async ($, on) => {
		// Arrange
		const band = await open($, on, REPLY, { bodyColumns: 40 });

		// Act
		const drawn = await textOf(band);

		// Assert
		expect(drawn).not.toContain(WIDE);
		expect(drawn).toContain("…");
	}
);

test(
	"an explanation with two titled parts draws both",
	MOUNT,
	async ($, on) => {
		// Arrange
		const band = await open(
			$,
			on,
			"learn: x\nexplain: **Order**\nTests run top to bottom.\n\n**Second**\nLead2"
		);

		// Act
		const drawn = await textOf(band);

		// Assert
		expect(drawn).toContain("Order");
		expect(drawn).toContain("Tests run top to bottom.");
		expect(drawn).toContain("Second");
		expect(drawn).toContain("Lead2");
	}
);

test(
	"a title that is too long is cut short with an ellipsis",
	MOUNT,
	async ($, on) => {
		// Arrange
		const title = "word ".repeat(40).trim();
		const band = await open($, on, `learn: x\nexplain: **${title}**\nbody`);

		// Act
		const drawn = await textOf(band);

		// Assert
		expect(drawn).not.toContain(title);
		expect(drawn).toContain("…");
	}
);

test(
	"an escape sequence in a sketch line is not drawn",
	MOUNT,
	async ($, on) => {
		// Arrange
		const band = await open(
			$,
			on,
			"learn: x\nexplain: **A**\n```\nx\u001B[31my\n```"
		);

		// Act
		const drawn = await textOf(band);

		// Assert
		expect(drawn).toContain('"source":"xy"');
		expect(drawn).not.toContain("[31m");
	}
);

test(
	"a survey keeps the sketch card and draws no button",
	MOUNT,
	async ($, on) => {
		// Arrange
		const band = await open($, on, REPLY);
		const survey = await $.ui.mount({
			plugin: PLUGIN,
			surface: "terminal",
			component: "AbovePrompt",
			props: { ...PROPS, hasSurvey: true }
		});

		// Act
		const drawn = await textOf(survey);

		// Assert
		expect(await band.find({ key: "Understood" })).toBeDefined();
		expect(drawn).toContain("A -> B");
		expect(await survey.find({ key: "Understood" })).toBeUndefined();
	}
);
