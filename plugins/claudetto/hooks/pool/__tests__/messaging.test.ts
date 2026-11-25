import { describe, expect, test } from "claude-code/testing";

import { registerMessagingDescribe } from "../messaging";

const provider = { plugin: "engine", tier: "core" } as const;
const STOCK = "A stock description ".repeat(300);

describe("messaging tool.describe", () => {
	test("replaces the stock text of SendMessage and ListAgents", async ($, on) => {
		// Arrange
		on("tool.describe", (_$, e) => ({ description: e.description }));
		registerMessagingDescribe(on);

		// Act
		const rendered = await Promise.all(
			["SendMessage", "ListAgents"].map((tool) =>
				$.tool.describe({ tool, description: STOCK, provider })
			)
		);

		// Assert
		expect(rendered.every((r) => r.description !== STOCK)).toBe(true);
	});

	test("lists SendMessage behind ToolSearch", async ($, on) => {
		// Arrange
		on("tool.describe", (_$, e) => ({ description: e.description }));
		registerMessagingDescribe(on);

		// Act
		const { isDeferred } = await $.tool.describe({
			tool: "SendMessage",
			description: STOCK,
			provider
		});

		// Assert
		expect(isDeferred).toBe(true);
	});

	test("keeps ListAgents inline, where ToolSearch can name it", async ($, on) => {
		// Arrange
		on("tool.describe", (_$, e) => ({ description: e.description }));
		registerMessagingDescribe(on);

		// Act
		const { isDeferred } = await $.tool.describe({
			tool: "ListAgents",
			description: STOCK,
			provider
		});

		// Assert
		expect(isDeferred).toBe(false);
	});
});
