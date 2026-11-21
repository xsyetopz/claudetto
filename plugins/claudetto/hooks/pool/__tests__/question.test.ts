import type { On } from "claude-code";
import { describe, expect, test } from "claude-code/testing";

import { TOOL_DESCRIPTIONS } from "../describe";
import { QUESTION_RULE } from "../question-rule";

const wire = (on: On): void => {
	on("tool.describe", (_$, e) => ({ description: e.description }));
	on("settings.read", () => ({ value: {} }));
	on("env.get", () => ({ value: undefined }));
	on("ui.log", () => ({ value: undefined }));
};

describe("AskUserQuestion rule", () => {
	test("the description keeps its base text and appends the rule", async ($, on) => {
		// Arrange
		wire(on);

		// Act
		const { description } = await $.tool.describe({
			tool: "AskUserQuestion",
			description: "stock text",
			provider: { plugin: "engine", tier: "core" }
		});

		// Assert
		expect(description).toBe(
			`${TOOL_DESCRIPTIONS["AskUserQuestion"]}${QUESTION_RULE}`
		);
		expect(
			description.startsWith(TOOL_DESCRIPTIONS["AskUserQuestion"] ?? "")
		).toBe(true);
		expect(description).toContain("ask it with one `AskUserQuestion` call");
	});

	test("another tool's description stays as it was", async ($, on) => {
		// Arrange
		wire(on);

		// Act
		const { description } = await $.tool.describe({
			tool: "Read",
			description: "stock text",
			provider: { plugin: "engine", tier: "core" }
		});

		// Assert
		expect(description).toBe(TOOL_DESCRIPTIONS["Read"]);
	});
});
