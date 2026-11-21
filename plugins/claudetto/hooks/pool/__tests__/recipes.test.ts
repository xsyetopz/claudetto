import type { On } from "claude-code";
import { describe, expect, test } from "claude-code/testing";

import { TOOL_DESCRIPTIONS } from "../describe";
import { BASH_RECIPES } from "../recipes";

const wire = (on: On): void => {
	on("tool.describe", (_$, e) => ({ description: e.description }));
	on("settings.read", () => ({ value: {} }));
	on("env.get", () => ({ value: undefined }));
	on("ui.log", () => ({ value: undefined }));
};

describe("Bash recipes", () => {
	test("the Bash description carries the background and perl recipes after the short text", async ($, on) => {
		// Arrange
		wire(on);

		// Act
		const { description } = await $.tool.describe({
			tool: "Bash",
			description: "stock text",
			provider: { plugin: "engine", tier: "core" }
		});

		// Assert
		expect(description).toBe(`${TOOL_DESCRIPTIONS["Bash"]}${BASH_RECIPES}`);
		expect(description).toContain("`set -o pipefail`");
		expect(description).toContain("exit $rc");
		expect(description).toContain("`Read` its output path");
		expect(description).toContain("`perl -pi -e`");
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
