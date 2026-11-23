import { describe, expect, test } from "bun:test";
import { join } from "node:path";

import { QUESTION_RULE } from "../../plugins/claudetto/hooks/pool/question-rule";
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

const QUESTION = QUESTION_RULE.trim();

/** The openings of the paragraphs the style keeps. */
const KEPT = [
	'Report "passes" or "done" after a run that could have failed.',
	"Write a list of controls, buttons, or steps the user performs",
	"When the user tells you to stop or to be quiet"
];

describe("output style holds no Bash recipes (REQ-TOOLS-031, issue #115)", () => {
	test("the background-command and perl recipes live in the Bash description", async () => {
		// Arrange
		const style = await Bun.file(styleFile).text();

		// Assert
		expect(style).not.toContain("run_in_background");
		expect(style).not.toContain("perl -pi -e");
		expect(style).not.toContain("pipefail");
	});
});

describe("output style holds no task conduct or tool use (REQ-TOOLS-031 and 032, issue #122)", () => {
	test("the moved paragraphs and the conduct paragraphs are not in the style", async () => {
		// Arrange
		const style = await Bun.file(styleFile).text();

		// Assert
		expect(CONDUCT_PARAGRAPHS).toHaveLength(11);
		expect(style).not.toContain(QUESTION);
		expect(style).not.toContain("AskUserQuestion");
		for (const paragraph of CONDUCT_PARAGRAPHS) {
			expect(style).not.toContain(paragraph);
			expect(style).not.toContain(paragraph.slice(0, 40));
		}
	});

	test("the AskUserQuestion paragraph is on its tool description once, and each conduct paragraph in the conduct section once", () => {
		// Assert
		expect(count(QUESTION_RULE, QUESTION)).toBe(1);
		for (const paragraph of CONDUCT_PARAGRAPHS) {
			expect(count(CONDUCT, paragraph)).toBe(1);
		}
		expect(count(CONDUCT, QUESTION)).toBe(0);
	});

	test("the style keeps its three paragraphs and its front matter", async () => {
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
