import { describe, expect, test } from "claude-code/testing";

import { TOOL_FULL_NAME } from "../../patch/texts";
import { TOOL_FULL_NAME as READ_FULL_NAME } from "../../read/texts";
import {
	HIDDEN_TOOLS,
	MAIN_ONLY_TOOLS,
	registerToolOffer,
	SUBAGENT_HIDDEN_TOOLS
} from "../offer";

const provider = { plugin: "engine", tier: "core" } as const;

describe("tool.offer", () => {
	test("hides each hidden tool in the main loop", async ($, on) => {
		// Arrange
		on("tool.offer", () => ({ isOffered: true }));
		registerToolOffer(on);

		// Act
		const offers = await Promise.all(
			HIDDEN_TOOLS.map((tool) => $.tool.offer({ tool, provider }))
		);

		// Assert
		expect(offers.every((o) => !o.isOffered)).toBe(true);
	});

	test("hides each hidden tool in a subagent's loop", async ($, on) => {
		// Arrange
		on("tool.offer", () => ({ isOffered: true }));
		registerToolOffer(on);

		// Act
		const offers = await Promise.all(
			HIDDEN_TOOLS.map((tool) =>
				$.tool.offer({
					tool,
					provider,
					agentId: "a1",
					subagentType: "Heracles"
				})
			)
		);

		// Assert
		expect(offers.every((o) => !o.isOffered)).toBe(true);
	});

	test("offers SendMessage and ListAgents in the main loop", async ($, on) => {
		// Arrange
		on("tool.offer", () => ({ isOffered: true }));
		registerToolOffer(on);

		// Act
		const offers = await Promise.all(
			MAIN_ONLY_TOOLS.map((tool) => $.tool.offer({ tool, provider }))
		);

		// Assert
		expect(offers.every((o) => o.isOffered)).toBe(true);
	});

	test("hides SendMessage and ListAgents in a subagent's loop", async ($, on) => {
		// Arrange
		on("tool.offer", () => ({ isOffered: true }));
		registerToolOffer(on);

		// Act
		const offers = await Promise.all(
			MAIN_ONLY_TOOLS.map((tool) =>
				$.tool.offer({
					tool,
					provider,
					agentId: "a1",
					subagentType: "Heracles"
				})
			)
		);

		// Assert
		expect(offers.every((o) => !o.isOffered)).toBe(true);
	});

	test("offers Monitor, TaskStop and the goal tools in the main loop", async ($, on) => {
		// Arrange
		on("tool.offer", () => ({ isOffered: true }));
		registerToolOffer(on);

		// Act
		const offers = await Promise.all(
			SUBAGENT_HIDDEN_TOOLS.map((tool) => $.tool.offer({ tool, provider }))
		);

		// Assert
		expect(offers.every((o) => o.isOffered)).toBe(true);
	});

	test("hides Monitor, TaskStop and the goal tools in a subagent's loop", async ($, on) => {
		// Arrange
		on("tool.offer", () => ({ isOffered: true }));
		registerToolOffer(on);

		// Act
		const offers = await Promise.all(
			SUBAGENT_HIDDEN_TOOLS.map((tool) =>
				$.tool.offer({
					tool,
					provider,
					agentId: "a1",
					subagentType: "claudetto:Heracles"
				})
			)
		);

		// Assert
		expect(SUBAGENT_HIDDEN_TOOLS).toContain("mcp__claudetto__set_goal");
		expect(offers.every((o) => !o.isOffered)).toBe(true);
	});

	test("keeps Bash, Agent, patch and read", async ($, on) => {
		// Arrange
		on("tool.offer", () => ({ isOffered: true }));
		registerToolOffer(on);

		// Act
		const kept = await Promise.all(
			["Bash", "Agent", TOOL_FULL_NAME, READ_FULL_NAME].map((tool) =>
				$.tool.offer({ tool, provider })
			)
		);

		// Assert
		expect(kept.every((o) => o.isOffered)).toBe(true);
	});
});
