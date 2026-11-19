import { describe, expect, test } from "claude-code/testing";

import { DEFAULTS, FILL_VERSION, RETIRED_REMINDER_TEXTS, fillNotice, fillSettings, fillVersion } from "./defaults";

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
		expect(next.outputStyle).toBe("claudetto:Claudetto");
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
			outputStyle: "Proactive",
			env: { CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS: "8" },
			worktree: { baseRef: "fresh", symlinkDirectories: ["node_modules"] },
			permissions: { deny: ["Workflow", "Bash(rm *)"], allow: ["Read"] },
			sandbox: { enabled: false, excludedCommands: ["docker *"] },
		});

		// Act
		const next = JSON.parse(fillSettings(text)?.text ?? "");

		// Assert
		expect(next.skillListingMaxDescChars).toBe(500);
		expect(next.outputStyle).toBe("Proactive");
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

describe("fill notice", () => {
	test("counts list entries per key so a first fill fits the 2000 characters the terminal draws", () => {
		// Arrange
		const added = fillSettings(undefined)?.added ?? [];

		// Act
		const notice = fillNotice("/home/u/.claude/settings.json", added);

		// Assert
		expect(added.join(", ").length).toBeGreaterThan(2000);
		expect(notice.length).toBeLessThan(2000);
		expect(notice).toContain("outputStyle");
		expect(notice).toMatch(/permissions\.deny \(\d+ entries\)/);
		expect(notice.match(/permissions\.deny/g)?.length).toBe(1);
		expect(notice).not.toMatch(/(^|, )(deny|ask|sandbox) \(/);
	});

	test("reports a removed retired text as a removal, not as a set default", () => {
		// Arrange
		const full = JSON.parse(fillSettings("{}")?.text ?? "");
		full.env.CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT = RETIRED_REMINDER_TEXTS[0];
		const added = fillSettings(JSON.stringify(full))?.added ?? [];

		// Act
		const notice = fillNotice("/home/u/.claude/settings.json", added);

		// Assert
		expect(added).toEqual(["removed env.CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT"]);
		expect(notice).toContain("removed env.CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT");
		expect(notice).not.toMatch(/set 1 unset default/);
	});
});

describe("fill version", () => {
	test("changes when any default in the filled text changes", () => {
		// Arrange
		const text = fillSettings(undefined, [])?.text ?? "";

		// Act
		const changed = fillVersion(text.replace("git push --force*", "git push --force-x*"));

		// Assert
		expect(FILL_VERSION).toBe(fillVersion(text));
		expect(changed).not.toBe(FILL_VERSION);
	});
});
