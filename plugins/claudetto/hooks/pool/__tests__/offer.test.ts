import { describe, expect, test } from "claude-code/testing";

import { TOOL_FULL_NAME } from "../../patch/texts";
import { HIDDEN_TOOLS, registerToolOffer } from "../offer";

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

	test("hides ListAgents, which only lists agents SendMessage reaches", async ($, on) => {
		// Arrange
		on("tool.offer", () => ({ isOffered: true }));
		registerToolOffer(on);

		// Act
		const offer = await $.tool.offer({ tool: "ListAgents", provider });

		// Assert
		expect(offer.isOffered).toBe(false);
	});

	test("keeps Bash, Read, Agent, the worktree tools and patch", async ($, on) => {
		// Arrange
		on("tool.offer", () => ({ isOffered: true }));
		registerToolOffer(on);

		// Act
		const kept = await Promise.all(
			[
				"Bash",
				"Read",
				"Agent",
				"EnterWorktree",
				"ExitWorktree",
				TOOL_FULL_NAME
			].map((tool) => $.tool.offer({ tool, provider }))
		);

		// Assert
		expect(kept.every((o) => o.isOffered)).toBe(true);
	});
});
