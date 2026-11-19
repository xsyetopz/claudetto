import { expect, test } from "claude-code/testing";

const BASE = "Executes a bash command and returns its output.";

test("the plugin leaves a tool description as the engine wrote it", async ($, on) => {
	// Arrange
	on("tool.describe", (_$, e) => ({ description: e.description }) as never);

	// Act
	const { description } = await $.tool.describe({ tool: "Bash", description: BASE, provider: { plugin: "engine", tier: "core" } } as never);

	// Assert
	expect(description).toBe(BASE);
});
