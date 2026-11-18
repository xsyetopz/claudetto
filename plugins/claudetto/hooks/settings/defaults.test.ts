import { describe, expect, test } from "claude-code/testing";

import { DENY, ENV, fillSettings } from "./defaults";

describe("defaults fill", () => {
	test("fills every default into empty settings", () => {
		// Act
		const fill = fillSettings(undefined);

		// Assert
		const next = JSON.parse(fill?.text ?? "");
		expect(next.permissions.deny).toEqual(expect.arrayContaining([...DENY]));
		expect(next.env).toEqual({ ...ENV });
		expect(next.worktree).toEqual({ baseRef: "head" });
		expect(next.skillListingMaxDescChars).toBe(60);
		expect(next.showClearContextOnPlanAccept).toBe(true);
		expect(next.permissions.deny).not.toContain("ExitPlanMode");
	});

	test("keeps every value the user set and adds only what is missing", () => {
		// Arrange
		const text = JSON.stringify({
			skillListingMaxDescChars: 500,
			env: { CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS: "8" },
			worktree: { baseRef: "fresh", symlinkDirectories: ["node_modules"] },
			permissions: { deny: ["Workflow", "Bash(rm *)"], allow: ["Read"] },
		});

		// Act
		const next = JSON.parse(fillSettings(text)?.text ?? "");

		// Assert
		expect(next.skillListingMaxDescChars).toBe(500);
		expect(next.env.CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS).toBe("8");
		expect(next.env.CLAUDE_CODE_DISABLE_ADVISOR_TOOL).toBe("1");
		expect(next.worktree).toEqual({ baseRef: "fresh", symlinkDirectories: ["node_modules"] });
		expect(next.permissions.allow).toEqual(["Read"]);
		expect(next.permissions.deny.filter((d: string) => d === "Workflow").length).toBe(1);
		expect(next.permissions.deny).toContain("Bash(rm *)");
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
