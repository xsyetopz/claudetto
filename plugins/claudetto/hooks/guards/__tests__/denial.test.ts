import type { On, ToolCheckResult } from "claude-code";
import { describe, type Engine, expect, test } from "claude-code/testing";

/** Core's side of a Bash check: answers each call with the verdict the test sets, and returns the model's view of it. */
const core = ($: Engine, on: On) => {
	let verdict: ToolCheckResult = { decision: "allow" };
	on("tool.check", () => verdict);
	return (next: ToolCheckResult) => {
		verdict = next;
		return $.tool.check({
			tool: "Bash",
			input: { command: "pkill -f worker" }
		});
	};
};

describe("denial source", () => {
	test("a deny from a settings rule names the rule and says no person declined it", async ($, on) => {
		// Arrange
		const check = core($, on);

		// Act
		const verdict = await check({
			decision: "deny",
			reason: "Permission denied.",
			rule: "Bash(pkill:*)"
		});

		// Assert
		expect(verdict.reason).toContain("Permission denied.");
		expect(verdict.reason).toContain("Bash(pkill:*)");
		expect(verdict.reason).toContain("no person declined it");
	});

	test("a deny from a hook or a setting names it", async ($, on) => {
		// Arrange
		const check = core($, on);

		// Act
		const hook = await check({ decision: "deny", hook: "PreToolUse" });
		const setting = await check({
			decision: "deny",
			setting: "permissions.blockReadsOutsideWorkingDirectories"
		});

		// Assert
		expect(hook.reason).toContain("PreToolUse");
		expect(setting.reason).toContain(
			"permissions.blockReadsOutsideWorkingDirectories"
		);
	});

	test("an ask, an allow and a deny with no named source stay as core made them", async ($, on) => {
		// Arrange
		const check = core($, on);

		// Act
		const ask = await check({ decision: "ask", rule: "Bash(rm:*)" });
		const allow = await check({ decision: "allow" });
		const plain = await check({
			decision: "deny",
			reason: "Plan mode."
		});

		// Assert
		expect(ask.reason).toBeUndefined();
		expect(allow.reason).toBeUndefined();
		expect(plain.reason).toBe("Plan mode.");
	});
});
