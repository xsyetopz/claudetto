import { describe, type Engine, expect, test } from "claude-code/testing";

import { AMEND_SECTION, AMEND_SECTION_ID } from "../../texts";

const MODEL = "claude-haiku-5-5";

const compose = ($: Engine) =>
	$.prompt.compose({
		model: MODEL,
		promptModel: MODEL,
		surfaces: [],
		tools: ["Bash"],
		outputStyle: null,
		traits: ["lean"]
	});

describe("amend rule section", () => {
	test("a repo with specs/ gets the amend rule as the last session section", async ($, on) => {
		// Arrange
		on("prompt.compose", () => ({
			sections: [{ id: "lean_body", text: "body", scope: "shared" }]
		}));
		// The engine resolves the relative path against the session directory.
		on("fs.exists", (_$, e) => ({ value: e.path.endsWith("/specs") }));

		// Act
		const { sections } = await compose($);

		// Assert
		expect(sections.at(-1)).toEqual({
			id: AMEND_SECTION_ID,
			scope: "session",
			text: AMEND_SECTION
		});
	});

	test("a repo without specs/ gets no amend section", async ($, on) => {
		// Arrange
		on("prompt.compose", () => ({
			sections: [{ id: "lean_body", text: "body", scope: "shared" }]
		}));
		on("fs.exists", () => ({ value: false }));

		// Act
		const { sections } = await compose($);

		// Assert
		expect(sections.map((s) => s.id)).toEqual(["lean_body"]);
	});
});
