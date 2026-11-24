import { describe, expect, test } from "claude-code/testing";

import { denialSource } from "../denial";

describe("denial source", () => {
	test("a deny from a settings rule names the rule and says no person declined it", async ($, on) => {
		// Arrange: core's verdict for a call a deny rule covers.
		on("tool.check", () => ({
			decision: "deny",
			reason: "Permission denied.",
			rule: "Bash(pkill:*)"
		}));

		// Act
		const verdict = await $.tool.check({
			tool: "Bash",
			input: { command: "pkill -f worker" }
		});

		// Assert
		expect(verdict.reason).toBe(
			"Permission denied. Denied by the permission rule `Bash(pkill:*)` in the settings; no permission prompt was shown and no person declined it. This block is the user's standing choice. When its message names a step inside the task, such as reading a file, take that step and retry; otherwise report what did not run and what it leaves undone, and neither route around the block nor ask the user to run the command or lift the block."
		);
	});

	test("every named deny tells the model not to hand the blocked step to the user", () => {
		// Act
		const texts = [
			denialSource({ decision: "deny", rule: "Bash(rm:*)" }),
			denialSource({ decision: "deny", hook: "PreToolUse" }),
			denialSource({ decision: "deny", setting: "sandbox.enabled" })
		];

		// Assert
		for (const text of texts) {
			expect(text).toContain(
				"neither route around the block nor ask the user to run the command or lift the block"
			);
		}
	});

	test("a deny from a hook or a setting names it", () => {
		// Act and Assert
		expect(denialSource({ decision: "deny", hook: "PreToolUse" })).toContain(
			"a PreToolUse hook"
		);
		expect(
			denialSource({
				decision: "deny",
				setting: "permissions.blockReadsOutsideWorkingDirectories"
			})
		).toContain("`permissions.blockReadsOutsideWorkingDirectories` setting");
	});

	test("an ask, an allow and a deny with no named source stay as core made them", () => {
		// Act and Assert
		expect(
			denialSource({ decision: "ask", rule: "Bash(rm:*)" })
		).toBeUndefined();
		expect(denialSource({ decision: "allow" })).toBeUndefined();
		expect(
			denialSource({ decision: "deny", reason: "Plan mode." })
		).toBeUndefined();
	});
});
