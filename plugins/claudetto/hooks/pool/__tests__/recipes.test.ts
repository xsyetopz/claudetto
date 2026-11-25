import type { On } from "claude-code";
import { describe, expect, test } from "claude-code/testing";

const provider = { plugin: "engine", tier: "core" } as const;

const wire = (on: On): void => {
	on("tool.describe", (_$, e) => ({ description: e.description }));
	on("settings.read", () => ({ value: {} }));
	on("env.get", () => ({ value: undefined }));
	on("ui.log", () => ({ value: undefined }));
};

describe("Bash recipes", () => {
	test("the Bash description points at the read tool for a background run's output, and Read's does not", async ($, on) => {
		// Arrange
		wire(on);

		// Act
		const bash = await $.tool.describe({
			tool: "Bash",
			description: "stock text",
			provider
		});
		const read = await $.tool.describe({
			tool: "Read",
			description: "stock text",
			provider
		});

		// Assert
		expect(bash.description).toContain("mcp__claudetto__read");
		expect(read.description).not.toContain("mcp__claudetto__read");
	});
});
