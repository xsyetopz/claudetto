import { describe, expect, test } from "claude-code/testing";

describe("/statusline", () => {
	test("the built-in prompt becomes an edit of the user's settings file carrying their request", async ($, on) => {
		// Arrange
		on("env.get", (_$, e) => ({
			value: e.name === "CLAUDE_CONFIG_DIR" ? "/cfg" : undefined
		}));

		// Act
		const out = await $.skill.prompt({
			skill: "statusline",
			source: "built-in",
			text: 'Create an Agent with subagent_type "statusline-setup" and the prompt "show git branch"'
		});

		// Assert
		expect(out.text).toContain("@/cfg/settings.json");
		expect(out.text).toContain("show git branch");
		expect(out.text).not.toContain("statusline-setup");
	});

	test("a skill of the same name from elsewhere keeps its own prompt", async ($, on) => {
		// Arrange
		on("env.get", () => ({ value: undefined }));
		on("skill.prompt", (_$, e) => ({ text: e.text }));

		// Act
		const out = await $.skill.prompt({
			skill: "statusline",
			source: "user",
			text: "my own"
		});

		// Assert
		expect(out.text).toBe("my own");
	});
});
