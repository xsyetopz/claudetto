import { describe, expect, test } from "claude-code/testing";

import { fieldOf, stringsOf } from "../../shared/field";
import {
	DEFAULTS,
	FILL_VERSION,
	fillNotice,
	fillSettings,
	fillVersion,
	RETIRED_ALLOWS,
	RETIRED_COMMIT_TRAILERS,
	RETIRED_REMINDER_TEXTS
} from "../defaults";
import { isRecord } from "../settings";

interface Filled {
	attribution: { commit?: string; pr?: string };
	bashOutputMaxChars: number;
	env: {
		CLAUDE_ASYNC_AGENT_STALL_TIMEOUT_MS?: string;
		CLAUDE_CODE_DISABLE_ADVISOR_TOOL?: string;
		CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS?: string;
		CLAUDE_CODE_SILENT_TURN_REMINDER?: string;
		CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT?: string | undefined;
	};
	outputStyle: string;
	permissions: { allow: string[]; deny: string[] };
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
	test("fills every default into empty settings", () => {
		// Act
		const fill = fillSettings();

		// Assert
		const next = parsed(fill?.text);
		const { permissions, ...rest } = isRecord(DEFAULTS) ? DEFAULTS : {};
		const wanted = {
			allow: stringsOf(fieldOf(permissions, "allow")) ?? [],
			deny: stringsOf(fieldOf(permissions, "deny")) ?? []
		};
		expect(next).toMatchObject(rest);
		expect(next.permissions.deny).toEqual(expect.arrayContaining(wanted.deny));
		expect(next.permissions.allow).toEqual(wanted.allow);
		expect(next.permissions.deny).not.toContain("ExitPlanMode");
		expect(next.bashOutputMaxChars).toBe(8000);
		expect(next.outputStyle).toBe("claudetto:Claudetto");
		expect(next.env.CLAUDE_CODE_SILENT_TURN_REMINDER).toBe("0");
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

		// Assert: on 2.1.327 a ToolSearch deny adds 28,025 bytes to the first request and a Skill deny 8,855 (REQ-SETUP-022).
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

		// Assert: the stall timeout counts silence, and script caps would force the default permission mode (REQ-SETUP-056).
		expect(next.env.CLAUDE_ASYNC_AGENT_STALL_TIMEOUT_MS).toBe("900000");
		expect(next.env).not.toHaveProperty("CLAUDE_CODE_SCRIPT_CAPS");
		expect(next.env).not.toHaveProperty("CLAUDE_CODE_SUBPROCESS_ENV_SCRUB");
	});

	test("keeps every value the user set and adds only what is missing", () => {
		// Arrange
		const text = JSON.stringify({
			skillListingMaxDescChars: 500,
			outputStyle: "Proactive",
			env: { CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS: "8" },
			worktree: { baseRef: "fresh", symlinkDirectories: ["node_modules"] },
			permissions: { deny: ["Workflow", "Bash(rm *)"], allow: ["Read"] },
			sandbox: { enabled: false, excludedCommands: ["docker *"] }
		});

		// Act
		const next = parsed(fillSettings(text)?.text);

		// Assert
		expect(next.skillListingMaxDescChars).toBe(500);
		expect(next.outputStyle).toBe("Proactive");
		expect(next.env.CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS).toBe("8");
		expect(next.env.CLAUDE_CODE_DISABLE_ADVISOR_TOOL).toBe("1");
		expect(next.worktree).toEqual({
			baseRef: "fresh",
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
		expect(next.sandbox.enabled).toBe(false);
		expect(next.sandbox.excludedCommands[0]).toBe("docker *");
		expect(next.sandbox.excludedCommands).toContain("claude *");
	});

	test("removes a retired reminder text and keeps one the user wrote", () => {
		// Arrange
		const retired = JSON.stringify({
			env: { CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT: RETIRED_REMINDER_TEXTS[0] }
		});
		const own = JSON.stringify({
			env: { CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT: "my own words" }
		});

		// Act
		const removed = parsed(fillSettings(retired)?.text);
		const kept = parsed(fillSettings(own)?.text);

		// Assert
		expect(removed.env.CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT).toBeUndefined();
		expect(kept.env.CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT).toBe("my own words");
	});

	test("removes the retired claude -p allow, so a paid headless run asks first", () => {
		// Arrange
		const held = JSON.stringify({
			permissions: { allow: ["Read", RETIRED_ALLOWS[0]] }
		});

		// Act
		const fill = fillSettings(held);
		const next = parsed(fill?.text);

		// Assert
		expect(next.permissions.allow).toEqual([
			"Read",
			"Bash(perl -0pi -e *)",
			"Bash(perl -pi -e *)"
		]);
		expect(fill?.added).toContain(
			"removed permissions.allow Bash(claude -p *)"
		);
	});

	test("replaces the retired Assisted-by commit trailer and keeps one the user wrote", () => {
		// Arrange
		const retired = JSON.stringify({
			attribution: { commit: RETIRED_COMMIT_TRAILERS[0], pr: "mine" }
		});
		const own = JSON.stringify({
			attribution: { commit: "Assisted-by: my-agent" }
		});

		// Act
		const replaced = fillSettings(retired);
		const kept = parsed(fillSettings(own)?.text);

		// Assert
		expect(parsed(replaced?.text).attribution).toEqual({
			commit: "Co-Authored-By: Claude <noreply@anthropic.com>",
			pr: "mine"
		});
		expect(replaced?.added).toContain(
			"replaced attribution.commit Assisted-by: Claude Code"
		);
		expect(fillNotice("s.json", replaced?.added ?? [])).toContain(
			"; replaced attribution.commit Assisted-by: Claude Code."
		);
		expect(kept.attribution.commit).toBe("Assisted-by: my-agent");
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
		const added = fillSettings()?.added ?? [];

		// Act
		const notice = fillNotice("/home/u/.claude/settings.json", added);

		// Assert
		expect(added.join(", ").length).toBeGreaterThan(2000);
		expect(notice.length).toBeLessThan(2000);
		expect(notice).toContain("outputStyle");
		expect(notice).toMatch(/permissions\.deny \(\d+ entries\)/u);
		expect(notice.match(/permissions\.deny/gu)?.length).toBe(1);
		expect(notice).not.toMatch(/(^|, )(deny|ask|sandbox) \(/u);
	});

	test("reports a removed retired text as a removal, not as a set default", () => {
		// Arrange
		const full = parsed(fillSettings("{}")?.text);
		full.env.CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT = RETIRED_REMINDER_TEXTS[0];
		const added = fillSettings(JSON.stringify(full))?.added ?? [];

		// Act
		const notice = fillNotice("/home/u/.claude/settings.json", added);

		// Assert
		expect(added).toEqual([
			"removed env.CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT"
		]);
		expect(notice).toContain(
			"removed env.CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT"
		);
		expect(notice).not.toMatch(/set 1 unset default/u);
	});
});

describe("fill version", () => {
	test("changes when any default in the filled text changes", () => {
		// Arrange
		const text = fillSettings(void 0, [])?.text ?? "";

		// Act
		const changed = fillVersion(
			text.replace("git push --force*", "git push --force-x*")
		);

		// Assert
		expect(FILL_VERSION).toBe(fillVersion(text));
		expect(changed).not.toBe(FILL_VERSION);
	});
});
