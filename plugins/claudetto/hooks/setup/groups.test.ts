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

test("the features-off group writes every switch and environment variable", () => {
	expect(groupNamed("Features off").settings).toEqual({
		$schema: "https://clawdipedia.cc/schemas/claude-code-settings.json",
		minimumVersion: "2.1.318",
		workflowSizeGuideline: "unrestricted",
		workflowKeywordTriggerEnabled: false,
		enableWorkflows: false,
		enableArtifact: false,
		remoteControlAtStartup: false,
		disableClaudeAiConnectors: true,
		syncClaudeAiSkills: false,
		syncClaudeAiPlugins: false,
		autoUploadSessions: false,
		disableRemoteControl: true,
		inputNeededNotifEnabled: false,
		agentPushNotifEnabled: false,
		autoMemoryEnabled: false,
		autoDreamEnabled: false,
		promptSuggestionEnabled: false,
		awaySummaryEnabled: false,
		spinnerTipsEnabled: false,
		feedbackDrafts: "off",
		feedbackSurveyRate: 0,
		todoFeatureEnabled: false,
		voiceEnabled: false,
		includeGitInstructions: false,
		showThinkingSummaries: false,
		attribution: false,
		autoContinueAtUsageLimit: true,
		switchModelsOnFlag: false,
		precomputeCompactionEnabled: false,
		showClearContextOnPlanAccept: true,
		useAutoModeDuringPlan: false,
		crossSessionInbound: "accept",
		prefersReducedMotion: true,
		env: {
			CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS: "1",
			CLAUDE_CODE_DISABLE_ADVISOR_TOOL: "1",
			CLAUDE_CODE_DISABLE_CRON: "1",
			CLAUDE_CODE_FORK_SUBAGENT: "0",
			CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH: "1",
			CLAUDE_CODE_AUTO_CONNECT_IDE: "false",
			CLAUDE_CODE_DISABLE_TERMINAL_TITLE: "1",
			CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY: "1",
			CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT: SILENT_TURN_REMINDER,
			DISABLE_TELEMETRY: "1",
			DISABLE_ERROR_REPORTING: "1",
			DISABLE_EXTRA_USAGE_COMMAND: "1",
			DISABLE_FEEDBACK_COMMAND: "1",
			DISABLE_INSTALL_GITHUB_APP_COMMAND: "1",
			CLAUDE_CODE_DISABLE_FAST_MODE: "1",
			CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS: "1",
			CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL: "1",
			CLAUDE_CODE_THRIFTY_SONIC: "0",
		},
	});
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
				allowWrite: ["~/", "/Volumes/", "/private/tmp"],
				denyWrite: words(
					"~/.zshrc ~/.zshenv ~/.zprofile ~/.bashrc ~/.bash_profile ~/.profile ~/.config/fish ~/.gitconfig ~/.config/git ~/.ssh ~/Library/LaunchAgents ~/.local/bin ~/.bun/bin ~/bin",
				),
				denyRead: words(
					"~/Library/Keychains ~/.aws ~/.azure ~/.config/gcloud ~/.netrc ~/.git-credentials",
				),
			},
			network: {
				allowedDomains: ["*"],
				allowMachLookup: ["*"],
				allowLocalBinding: true,
			},
		},
	});
});
