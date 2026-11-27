import { describe, expect, test } from "claude-code/testing";

import { fillNotice, fillSettings } from "../defaults";
import { isRecord } from "../settings";

interface Filled {
	attribution: { commit?: string; pr?: string };
	bashOutputMaxChars: number;
	env: {
		[key: string]: string | undefined;
		CLAUDE_ASYNC_AGENT_STALL_TIMEOUT_MS?: string;
		CLAUDE_CODE_DISABLE_ADVISOR_TOOL?: string;
		CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS?: string;
		CLAUDE_CODE_SILENT_TURN_REMINDER?: string;
		CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT?: string | undefined;
	};
	legacy?: unknown;
	outputStyle: string;
	permissions: { allow: string[]; ask: string[]; deny: string[] };
	sandbox: {
		allowUnsandboxedCommands: boolean;
		autoAllowBashIfSandboxed: boolean;
		enabled: boolean;
		excludedCommands: string[];
		filesystem: { allowWrite: string[]; denyWrite: string[] };
		network: { allowAllUnixSockets: boolean; allowedDomains?: string[] };
	};
	skillListingMaxDescChars: number;
	worktree: { baseRef: string; symlinkDirectories: string[] };
}

const isFilled = (value: unknown): value is Filled => isRecord(value);

const parsed = (text: string | undefined): Filled => {
	const value: unknown = JSON.parse(text ?? "");
	if (!isFilled(value)) {
		throw new Error("settings text is not a JSON object");
	}
	return value;
};

describe("defaults fill", () => {
	test("fills the construction into empty settings", () => {
		// Act
		const fill = fillSettings();

		// Assert
		const next = parsed(fill?.text);
		expect(next.permissions.deny).not.toContain("ExitPlanMode");
		expect(next.bashOutputMaxChars).toBe(8000);
		expect(next.outputStyle).toBe("claudetto:Claudetto");
		expect(next.env.CLAUDE_CODE_SILENT_TURN_REMINDER).toBe("0");
		// SETUP-063: the reminder is silenced by the flag alone; no `_TEXT` key is written.
		expect(next.env.CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT).toBeUndefined();
		expect(
			Object.keys(next.env).filter((key) => key.endsWith("_TEXT"))
		).toEqual([]);
		expect(next.env).toMatchObject({
			CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH: "1",
			CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS: "3",
			CLAUDE_CODE_DISABLE_CRON: "1",
			CLAUDE_CODE_DISABLE_ADVISOR_TOOL: "1"
		});
		expect(next.worktree.baseRef).toBe("head");
	});

	test("writes the minimal sandbox block of ADR-0188", () => {
		// Act
		const next = parsed(fillSettings("{}")?.text);

		// Assert
		expect(next.sandbox.enabled).toBe(true);
		expect(next.sandbox.autoAllowBashIfSandboxed).toBe(true);
		expect(next.sandbox.allowUnsandboxedCommands).toBe(true);
		expect(next.sandbox.excludedCommands).toContain("claude *");
		expect(next.sandbox.network.allowAllUnixSockets).toBe(true);
		expect(next.sandbox.network.allowedDomains).toBeUndefined();
		expect(next.sandbox.filesystem.allowWrite).toEqual(
			expect.arrayContaining(["/opt/homebrew", "/private/var/folders"])
		);
		expect(next.sandbox.filesystem.denyWrite).toContain(
			"/private/var/folders/**/xcrun_db*"
		);
		expect(next.permissions.allow).toEqual([
			"Bash(perl -0pi -e *)",
			"Bash(perl -pi -e *)"
		]);
	});

	test("writes no key that stops claudetto's own hooks or skills and denies no tool whose removal grows the request", () => {
		// Act
		const next = parsed(fillSettings()?.text);

		// Assert: on 2.1.327 a ToolSearch deny adds 28,025 bytes to the first request and a Skill deny 8,855 (SETUP-022).
		for (const key of [
			"disableAllHooks",
			"disableSkillShellExecution",
			"disableSideloadFlags",
			"disableCommandPluginSources"
		]) {
			expect(next).not.toHaveProperty(key);
		}
		for (const tool of ["ToolSearch", "Skill", "Bash"]) {
			expect(next.permissions.deny).not.toContain(tool);
		}
	});

	test("writes the stall timeout and no script caps", () => {
		// Act
		const next = parsed(fillSettings()?.text);

		// Assert: the stall timeout counts silence, and script caps would force the default permission mode (SETUP-056).
		expect(next.env.CLAUDE_ASYNC_AGENT_STALL_TIMEOUT_MS).toBe("900000");
		expect(next.env).not.toHaveProperty("CLAUDE_CODE_SCRIPT_CAPS");
		expect(next.env).not.toHaveProperty("CLAUDE_CODE_SUBPROCESS_ENV_SCRUB");
	});

	test("sets every scalar the construction names over the user's value and keeps what it does not name", () => {
		// Arrange
		const text = JSON.stringify({
			skillListingMaxDescChars: 500,
			outputStyle: "Proactive",
			env: { CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS: "8", MY_VAR: "1" },
			worktree: { baseRef: "fresh", symlinkDirectories: ["node_modules"] },
			permissions: { deny: ["Workflow", "Bash(rm *)"], allow: ["Read"] },
			sandbox: { enabled: false, excludedCommands: ["docker *"] }
		});

		// Act
		const fill = fillSettings(text);
		const next = parsed(fill?.text);

		// Assert
		expect(next.skillListingMaxDescChars).toBe(200);
		expect(next.outputStyle).toBe("claudetto:Claudetto");
		expect(next.env.CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS).toBe("3");
		expect(next.env).toMatchObject({ MY_VAR: "1" });
		expect(next.worktree).toEqual({
			baseRef: "head",
			symlinkDirectories: ["node_modules"]
		});
		expect(next.permissions.allow).toEqual([
			"Read",
			"Bash(perl -0pi -e *)",
			"Bash(perl -pi -e *)"
		]);
		expect(
			next.permissions.deny.filter((d: string) => d === "Workflow").length
		).toBe(1);
		expect(next.permissions.deny).toContain("Bash(rm *)");
		expect(next.sandbox.enabled).toBe(true);
		expect(next.sandbox.excludedCommands[0]).toBe("docker *");
		expect(next.sandbox.excludedCommands).toContain("claude *");
		expect(fill?.added).toContain("replaced `outputStyle` `Proactive`");
		expect(fill?.added).toContain("replaced `sandbox.enabled` `false`");
	});

	test("removes the stash ask rules, and the claude -p allow in one fill", () => {
		// Arrange
		const text = JSON.stringify({
			permissions: {
				ask: ["Bash(git stash*)", "Bash(git * stash*)", "Bash(npm publish*)"],
				allow: ["Read", "Bash(claude -p *)"]
			}
		});

		// Act
		const fill = fillSettings(text);
		const next = parsed(fill?.text);

		// Assert
		expect(next.permissions.ask).not.toContain("Bash(git stash*)");
		expect(next.permissions.ask).not.toContain("Bash(git * stash*)");
		expect(next.permissions.ask).toContain("Bash(npm publish*)");
		expect(next.permissions.allow).not.toContain("Bash(claude -p *)");
		expect(next.permissions.allow).toContain("Read");
		expect(fill?.added).toContain(
			"removed `permissions.allow` `Bash(claude -p *)`"
		);
	});

	test("is idempotent: a second fill of its own output changes nothing, also after conflicts were removed", () => {
		// Arrange
		const first = fillSettings(
			JSON.stringify({
				outputStyle: "Proactive",
				permissions: {
					ask: ["Bash(git stash*)", "Bash(npm publish*)"],
					allow: ["Bash(claude -p *)"]
				}
			})
		);
		const text = first?.text ?? "";

		// Act
		const second = fillSettings(text, undefined, first?.owned);

		// Assert
		expect(first?.added.length).toBeGreaterThan(0);
		expect(second?.text).toBe(text);
		expect(second?.added).toEqual([]);
	});

	test("refuses to rewrite a file that is not a JSON object", () => {
		// Act and Assert
		expect(fillSettings("{ broken")).toBeUndefined();
	});
});

describe("fill notice", () => {
	test("reports a replaced value and a removed rule as changes, not as set values", () => {
		// Arrange
		const full = parsed(fillSettings("{}")?.text);
		full.outputStyle = "Proactive";
		const added = fillSettings(JSON.stringify(full))?.added ?? [];

		// Act
		const notice = fillNotice("/home/u/.claude/settings.json", [
			...added,
			"removed permissions.ask Bash(git stash*)"
		]);

		// Assert
		expect(added).toEqual(["replaced `outputStyle` `Proactive`"]);
		expect(notice).toContain("replaced `outputStyle` `Proactive`");
		expect(notice).toContain("removed permissions.ask Bash(git stash*)");
		expect(notice).not.toMatch(/set \d+ value/u);
	});
});
