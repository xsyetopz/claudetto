import { expect, test } from "claude-code/testing";

import {
	freshBox,
	isOffered,
	MOUNT,
	offered,
	textOf,
	untilShown
} from "../../__tests__/testkit";

/** Replies the check accepts, with the text a person then reads and the tag it carries. */
const ACCEPTED: readonly {
	readonly title: string;
	readonly reply: string;
	readonly shows: string;
	readonly tag?: string;
	readonly hides?: string;
}[] = [
	{
		title: "reads learn, tag and explain labels",
		reply:
			"learn: Tests run in order.\ntag: You should know\nexplain: **A title**\nA body that says what it is.",
		shows: "Tests run in order.",
		tag: "You should know"
	},
	{
		title: "takes the Heads up tag and ends the line with a period",
		reply: "learn: Beware the cache\ntag: Heads up",
		shows: "Beware the cache.",
		tag: "Heads up",
		hides: "You should know"
	},
	{
		title: "strips wrapping quotes",
		reply: 'learn: "Quoted line"',
		shows: "Quoted line.",
		// The drawn tree is JSON, so a leftover closing quote would appear as line\"
		hides: 'line\\"'
	},
	{
		title: "reads a bullet, a quote-wrapped line and a dash tag",
		reply: '- learn: "Cache is shared"\n> tag - Heads up',
		shows: "Cache is shared.",
		tag: "Heads up"
	},
	{
		title: "reads a quoted bold tag label in the dash form",
		reply: "learn: x\n> **tag** - Heads up",
		shows: "x.",
		tag: "Heads up"
	},
	{
		title: "joins a continuation line of learn",
		reply: "learn: First part\nsecond part.\ntag: You should know",
		shows: "First part second part."
	},
	{
		title: "falls through from a learn line over 240 characters to the next",
		reply: `learn: ${"a".repeat(241)}\nlearn: short one`,
		shows: "short one.",
		hides: "aaaaaaaaaa"
	},
	{
		title: "removes an escape sequence and collapses runs of blanks",
		reply: "learn: a\u001B[31m   b\u001B[0m \t c",
		shows: "a b c."
	}
];

for (const { title, reply, shows, tag, hides } of ACCEPTED) {
	test(`a check reply that ${title} draws the offer`, MOUNT, async ($, on) => {
		// Arrange
		const band = await offered($, on, freshBox(), { replies: [reply] });

		// Act
		const drawn = await textOf(band);

		// Assert
		expect(await isOffered(band)).toBe(true);
		expect(drawn).toContain(shows);
		if (tag !== undefined) {
			expect(drawn).toContain(tag);
		}
		if (hides !== undefined) {
			expect(drawn).not.toContain(hides);
		}
	});
}

for (const [title, reply] of [
	["declines with none", "learn: none"],
	["declines with None and a full stop", "learn: None."],
	["declines with none and punctuation, unlabeled", "none"],
	["has no learn label", "nothing"],
	["is empty", ""]
] as const) {
	test(`a check reply that ${title} draws no offer`, MOUNT, async ($, on) => {
		// Arrange
		const band = await offered($, on, freshBox(), {
			replies: [reply],
			isOffer: false
		});

		// Act
		const offer = await isOffered(band);

		// Assert
		expect(offer).toBe(false);
	});
}

test(
	"a reply with an explain label shows its explanation on Learn more",
	MOUNT,
	async ($, on) => {
		// Arrange
		const band = await offered($, on, freshBox(), {
			replies: ["learn: x\nexplain: **A**\nlead\nmore"]
		});

		// Act
		await band.press({ key: "Learn more" });
		await untilShown(band, "Understood");
		const drawn = await textOf(band);

		// Assert
		expect(drawn).toContain("lead");
		expect(drawn).toContain("more");
	}
);
