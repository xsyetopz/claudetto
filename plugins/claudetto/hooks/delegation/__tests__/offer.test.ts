import { describe, expect, test } from "claude-code/testing";

import { registerOffer } from "../offer";

describe("agent.offer", () => {
	test("hides a built-in agent type from the model", async ($, on) => {
		// Arrange
		registerOffer(on);

		// Act
		const offer = await $.agent.offer({
			agent: "Explore",
			description: "Fast read-only search",
			source: "built-in",
			provider: { plugin: "engine", tier: "core" }
		});

		// Assert
		expect(offer.isOffered).toBe(false);
	});
});
