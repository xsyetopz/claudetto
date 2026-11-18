import { describe, expect, test } from "claude-code/testing";

import { DEFAULTS, RETIRED_REMINDER_TEXTS, fillSettings } from "./defaults";

describe("defaults fill", () => {
	test("fills every default into empty settings", () => {
		// Act
		const fill = fillSettings(undefined);

		// Assert
		const next = JSON.parse(fill?.text ?? "");
		const { permissions, ...rest } = DEFAULTS as { permissions: { allow: string[]; deny: string[] } };
		expect(next).toMatchObject(rest);
		expect(next.permissions.deny).toEqual(expect.arrayContaining(permissions.deny));
		expect(next.permissions.allow).toEqual(permissions.allow);
		expect(next.permissions.deny).not.toContain("ExitPlanMode");
		expect(next.bashOutputMaxChars).toBe(8000);
		expect(next.env.CLAUDE_CODE_SILENT_TURN_REMINDER).toBe("0");
	});

	test("writes the minimal sandbox block of ADR-0188", () => {
		// Act
		const next = JSON.parse(fillSettings("{}")?.text ?? "");

		// Assert
		expect(next.sandbox.enabled).toBe(true);
		expect(next.sandbox.autoAllowBashIfSandboxed).toBe(true);
		expect(next.sandbox.excludedCommands).toContain("claude *");
		expect(next.sandbox.network.allowAllUnixSockets).toBe(true);
		expect(next.sandbox.filesystem.allowWrite).toEqual(expect.arrayContaining(["/opt/homebrew", "/private/var/folders"]));
		expect(next.sandbox.filesystem.denyWrite).toContain("/private/var/folders/**/xcrun_db*");
		expect(next.permissions.allow).toEqual(["Bash(claude -p *)", "Bash(perl -0pi -e *)", "Bash(perl -pi -e *)"]);
	});

	test("keeps every value the user set and adds only what is missing", () => {
		// Arrange
		const text = JSON.stringify({
			skillListingMaxDescChars: 500,
			env: { CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS: "8" },
			worktree: { baseRef: "fresh", symlinkDirectories: ["node_modules"] },
			permissions: { deny: ["Workflow", "Bash(rm *)"], allow: ["Read"] },
			sandbox: { enabled: false, excludedCommands: ["docker *"] },
		});

		// Act
		const next = JSON.parse(fillSettings(text)?.text ?? "");

		// Assert
		expect(next.skillListingMaxDescChars).toBe(500);
		expect(next.env.CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS).toBe("8");
		expect(next.env.CLAUDE_CODE_DISABLE_ADVISOR_TOOL).toBe("1");
		expect(next.worktree).toEqual({ baseRef: "fresh", symlinkDirectories: ["node_modules"] });
		expect(next.permissions.allow).toEqual(["Read", "Bash(claude -p *)", "Bash(perl -0pi -e *)", "Bash(perl -pi -e *)"]);
		expect(next.permissions.deny.filter((d: string) => d === "Workflow").length).toBe(1);
		expect(next.permissions.deny).toContain("Bash(rm *)");
		expect(next.sandbox.enabled).toBe(false);
		expect(next.sandbox.excludedCommands[0]).toBe("docker *");
		expect(next.sandbox.excludedCommands).toContain("claude *");
	});

	test("removes a retired reminder text and keeps one the user wrote", () => {
		// Arrange
		const retired = JSON.stringify({ env: { CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT: RETIRED_REMINDER_TEXTS[0] } });
		const own = JSON.stringify({ env: { CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT: "my own words" } });

		// Act
		const removed = JSON.parse(fillSettings(retired)?.text ?? "");
		const kept = JSON.parse(fillSettings(own)?.text ?? "");

		// Assert
		expect(removed.env.CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT).toBeUndefined();
		expect(kept.env.CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT).toBe("my own words");
	});

	test("leaves complete settings unchanged", () => {
		// Arrange
		const text = fillSettings("{}")?.text ?? "";

		// Act
		const fill = fillSettings(text);

		// Assert
		expect(fill).toEqual({ text, added: [] });
	});

	test("refuses to rewrite a file that is not a JSON object", () => {
		// Act and Assert
		expect(fillSettings("{ broken")).toBeUndefined();
	});
});
