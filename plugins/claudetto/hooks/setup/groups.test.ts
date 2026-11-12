import { expect, test } from "claude-code/testing";

import { SILENT_TURN_REMINDER } from "../texts.ts";
import { AUTO_MODE } from "./auto-mode.ts";
import { groupNamed } from "./settings.mock.ts";
import { DENIED_TOOLS, GROUPS, STATUS_LINE, valueAt } from "./settings.ts";

test("the groups are labelled in order", () => {
	expect(GROUPS.map((g) => g.label)).toEqual([
		"Smaller prompt",
		"Auto mode",
		"Models and windows",
		"Worktrees",
		"Output limits",
		"Features off",
		"Sandbox",
		"Status line",
	]);
	expect(STATUS_LINE.label).toBe("Status line");
});

test("the status line is a command", () => {
	const line = valueAt(STATUS_LINE.settings, ["statusLine"]);

	expect(line).toMatchObject({ type: "command", refreshInterval: 5 });
});

test("the smaller prompt allows read-only git, denies the trimmed tools, and picks the Concise style", () => {
	const { settings } = groupNamed("Smaller prompt");

	expect(settings["permissions"]).toEqual({
		allow: [
			"Bash(git status *)",
			"Bash(git diff)",
			"Bash(git log)",
			"Bash(git show)",
		],
		deny: DENIED_TOOLS,
	});
	expect(settings["outputStyle"]).toBe("claudetto:Concise");
});

test("the auto-mode group writes the autoMode lists", () => {
	expect(groupNamed("Auto mode").settings).toEqual({ autoMode: AUTO_MODE });
});

test("the models group writes the models, ceilings, and windows", () => {
	expect(groupNamed("Models and windows").settings).toEqual({
		model: "claude-opus-5-5",
		effortLevel: "medium",
		fallbackModel: ["claude-sonnet-5-5"],
		modelSettings: {
			"claude-opus-5-5": { maxEffortLevel: "high" },
			"claude-sonnet-5-5": { maxEffortLevel: "medium" },
			"claude-haiku-5-5": {
				maxEffortLevel: "high",
				autoCompactWindow: 200_000,
			},
		},
		autoCompactWindow: 300_000,
		idleCompaction: false,
		subagentPromptCacheTtl: "1h",
		env: {
			CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: "50.0000",
			CLAUDE_CODE_SUBAGENT_MODEL: "claude-sonnet-5-5",
			ANTHROPIC_DEFAULT_MODEL: "claude-opus-5-5",
			ANTHROPIC_DEFAULT_OPUS_MODEL: "claude-opus-5-5",
			ANTHROPIC_DEFAULT_SONNET_MODEL: "claude-sonnet-5-5",
			ANTHROPIC_DEFAULT_HAIKU_MODEL: "claude-haiku-5-5",
		},
	});
});

test("the output-limits group writes the Bash and MCP result limits Claude Code enforces", () => {
	expect(groupNamed("Output limits").settings).toEqual({
		bashOutputMaxChars: 8000,
		env: { MAX_MCP_OUTPUT_TOKENS: "10000" },
	});
});

test("the features-off group ends a silent background subagent, quiets the turn reminder, and writes no script caps", () => {
	const env = valueAt(groupNamed("Features off").settings, ["env"]);
	expect(env).toMatchObject({
		CLAUDE_ASYNC_AGENT_STALL_TIMEOUT_MS: "900000",
		CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT: SILENT_TURN_REMINDER,
	});
	expect(env).not.toHaveProperty("CLAUDE_CODE_SCRIPT_CAPS");
});

const words = (text: string): string[] => text.split(" ");

test("the sandbox group lists what is dangerous: home-wide writes, denies for files that run later and for secret stores, any host, service, and local port, and a retry outside it that the permission check decides", () => {
	// `~/.ssh` and `~/.gnupg` stay readable for commit signing; "the sandbox's denyRead leaves the signing keys readable" pins that.
	expect(groupNamed("Sandbox").settings).toEqual({
		sandbox: {
			enabled: true,
			allowUnsandboxedCommands: true,
			enableWeakerNetworkIsolation: true,
			excludedCommands: ["ps *", "top *", "sysctl *", "launchctl list"],
			filesystem: {
				allowWrite: ["~/", "/Volumes/", "/private/tmp", "/private/var/folders"],
				denyWrite: words(
					"~/.zshrc ~/.zshenv ~/.zprofile ~/.bashrc ~/.bash_profile ~/.profile ~/.config/fish ~/.gitconfig ~/.config/git ~/.ssh ~/Library/LaunchAgents ~/.local/bin ~/.bun/bin ~/bin /private/var/folders/*/*/T/xcrun_db*",
				),
				denyRead: words(
					"~/Library/Keychains ~/.aws ~/.azure ~/.config/gcloud ~/.netrc ~/.git-credentials",
				),
				allowRead: ["~/Library/Keychains/login.keychain-db"],
			},
			network: {
				allowedDomains: ["*"],
				allowMachLookup: ["*"],
				allowLocalBinding: true,
			},
		},
	});
});
