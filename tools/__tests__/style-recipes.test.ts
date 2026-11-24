import { describe, expect, test } from "bun:test";
import { join } from "node:path";

import {
	CONDUCT,
	CONDUCT_PARAGRAPHS
} from "../../plugins/claudetto/hooks/prompt/conduct";

const styleFile = join(
	import.meta.dir,
	"..",
	"..",
	"plugins",
	"claudetto",
	"output-styles",
	"claudetto.md"
);

/** How many times `part` appears in `text`. */
const count = (text: string, part: string): number =>
	text.split(part).length - 1;

/**
 * The AskUserQuestion paragraph. It measured higher on the style than on the
 * tool description (REQ-REPLY-108, RISK-535).
 */
const QUESTION =
	"When a choice belongs to the user (a preference, or a trade-off between options they named), ask it with one `AskUserQuestion` call that lists the options, and wait for the answer, because the question dialog records the choice and a question in reply text is easy to miss.";

/** The openings of the paragraphs the style keeps. */
const KEPT = [
	'Report "passes" or "done" after a run that could have failed.',
	"Write a list of controls, buttons, or steps the user performs",
	"When the user tells you to stop or to be quiet",
	"When a choice belongs to the user"
];

/**
 * The background exit-status and background-read paragraphs. On claude 2.1.329
 * they measured higher on the style than on the Bash description alone
 * (REQ-TOOLS-031, RISK-451).
 */
const BACKGROUND = [
	"A command started with `run_in_background` reports the exit status of its last command",
	"When the reply depends on the result of a command started with `run_in_background`"
];

describe("output style holds the measured background paragraphs and no other Bash recipe (REQ-TOOLS-031, issue #115, RISK-451)", () => {
	test("the perl recipe lives only in the Bash description", async () => {
		// Arrange
		const style = await Bun.file(styleFile).text();

		// Assert
		expect(style).not.toContain("perl -pi -e");
	});

	test("each background paragraph is in the style once", async () => {
		// Arrange
		const style = await Bun.file(styleFile).text();

		// Assert
		for (const start of BACKGROUND) {
			expect(count(style, start)).toBe(1);
		}
	});
});

describe("output style holds no task conduct (REQ-TOOLS-031 and 032, issue #122; REQ-REPLY-108)", () => {
	test("the conduct paragraphs are not in the style", async () => {
		// Arrange
		const style = await Bun.file(styleFile).text();

		// Assert
		expect(CONDUCT_PARAGRAPHS).toHaveLength(11);
		for (const paragraph of CONDUCT_PARAGRAPHS) {
			expect(style).not.toContain(paragraph);
			expect(style).not.toContain(paragraph.slice(0, 40));
		}
	});

	test("the AskUserQuestion paragraph is in the style once, and each conduct paragraph in the conduct section once", async () => {
		// Arrange
		const style = await Bun.file(styleFile).text();

		// Assert
		expect(count(style, QUESTION)).toBe(1);
		for (const paragraph of CONDUCT_PARAGRAPHS) {
			expect(count(CONDUCT, paragraph)).toBe(1);
		}
		expect(count(CONDUCT, QUESTION)).toBe(0);
	});

	test("the style keeps its four paragraphs and its front matter", async () => {
		// Arrange
		const style = await Bun.file(styleFile).text();

		// Assert
		for (const start of KEPT) {
			expect(count(style, start)).toBe(1);
		}
		expect(style.startsWith("---\nname: Claudetto\ndescription: ")).toBe(true);
		expect(style).toContain(
			"keep-coding-instructions: true\n---\n\n# Claudetto"
		);
	});
});
