import { expect, test } from "claude-code/testing";
import { SILENT_TURN_REMINDER } from "../texts.ts";
import { AUTO_MODE } from "./auto-mode.ts";
import {
	applyChanges,
	capGroup,
	changesOf,
	DENIED_TOOLS,
	GROUPS,
	type Json,
	parseSettings,
	STATUS_LINE,
	valueAt,
} from "./settings.ts";

const BUILTIN_KEY = /^cc-plugin-.+@builtin$/;
const SIGNING_KEYS = /\.ssh|\.gnupg/;

const everything = (held: Json): Json => {
	let settings = held;
	for (const group of GROUPS) {
		settings = applyChanges(settings, changesOf(settings, group), "replace");
	}
	return settings;
};

test("an empty file takes every group, and a second pass finds nothing to change", () => {
	const written = everything({});

	expect(GROUPS.flatMap((group) => changesOf(written, group))).toEqual([]);
});

test("the eight tools of the tool-trim are denied", () => {
	const deny = valueAt(everything({}), ["permissions", "deny"]);

	for (const tool of [
		"Workflow",
		"ScheduleWakeup",
		"ReportFindings",
		"CronCreate",
		"CronDelete",
		"CronList",
		"EnterPlanMode",
		"ExitPlanMode",
	]) {
		expect(deny).toContain(tool);
	}
});

test("no built-in agent and no tool that ToolSearch or Skill need is denied", () => {
	expect(DENIED_TOOLS.filter((rule) => rule.startsWith("Agent("))).toEqual([]);
	for (const needed of ["ToolSearch", "Skill", "Bash"]) {
		expect(DENIED_TOOLS).not.toContain(needed);
	}
});

test("telemetry is off through DISABLE_TELEMETRY alone", () => {
	const written = everything({});

	expect(valueAt(written, ["env", "DISABLE_TELEMETRY"])).toBe("1");
	expect(JSON.stringify(written)).not.toContain(
		"CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC",
	);
	expect(JSON.stringify(written)).not.toContain("cc-plugin-telemetry");
});

test("a deny list keeps the user's rules and adds ours once", () => {
	const held = { permissions: { deny: ["Read(**/.env)", "Workflow"] } };
	const written = everything(held);
	const deny = valueAt(written, ["permissions", "deny"]);

	expect(deny).toContain("Read(**/.env)");
	expect(Array.isArray(deny) && deny.filter((r) => r === "Workflow")).toEqual([
		"Workflow",
	]);
});

test("fill keeps a value the user set, and replace takes ours", () => {
	const group = GROUPS.find((g) => g.label === "Worktrees");
	if (group === undefined) {
		throw new Error("no worktrees group");
	}
	const held = { worktree: { baseRef: "fresh" } };

	const changes = changesOf(held, group);

	expect(
		valueAt(applyChanges(held, changes, "fill"), ["worktree", "baseRef"]),
	).toBe("fresh");
	expect(
		valueAt(applyChanges(held, changes, "replace"), ["worktree", "baseRef"]),
	).toBe("head");
});

test("other keys of the user's file stay as they are", () => {
	const written = everything({ theme: "dark", env: { MINE: "1" } });

	expect(valueAt(written, ["theme"])).toBe("dark");
	expect(valueAt(written, ["env", "MINE"])).toBe("1");
});

test("a file that is not a JSON object is refused and a missing file is empty", () => {
	expect(parseSettings("[1]")).toBeUndefined();
	expect(parseSettings("{")).toBeUndefined();
	expect(parseSettings(undefined)).toEqual({});
});

test("the auto-mode lists replace the built-ins, so none names $defaults", () => {
	for (const list of Object.values(AUTO_MODE)) {
		expect(list.length).toBeGreaterThan(0);
		expect(list).not.toContain("$defaults");
	}
});

test("eleven built-in plugins are off as cc-plugin-<name>@builtin", () => {
	const entries = Object.entries(
		new Object(valueAt(everything({}), ["enabledPlugins"])),
	);

	expect(entries).toHaveLength(11);
	for (const [key, value] of entries) {
		expect(key).toMatch(BUILTIN_KEY);
		expect(value).toBe(false);
	}
});

test("auto mode writes no classifyAllShell", () => {
	expect(JSON.stringify(everything({}))).not.toContain("classifyAllShell");
});

test("the models are the three of this release and nothing else", () => {
	const text = JSON.stringify(GROUPS);
	const names = text.match(/claude-[a-z]+-[0-9-]+/g) ?? [];

	expect(new Set(names)).toEqual(
		new Set(["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5"]),
	);
});

test("the bundled-skill switch and the compaction keys are written", () => {
	const written = everything({});

	expect(valueAt(written, ["disableBundledSkills"])).toBe(true);
	expect(valueAt(written, ["autoCompactWindow"])).toBe(300_000);
	expect(valueAt(written, ["idleCompaction"])).toBe(false);
	expect(valueAt(written, ["env", "CLAUDE_AUTOCOMPACT_PCT_OVERRIDE"])).toBe(
		"50.0000",
	);
});

test("the status line refreshes every 5 seconds, and fill keeps the user's own", () => {
	const mine = { statusLine: { type: "command", command: "mine" } };

	expect(
		valueAt(applyChanges({}, changesOf({}, STATUS_LINE), "fill"), [
			"statusLine",
			"refreshInterval",
		]),
	).toBe(5);
	expect(applyChanges(mine, changesOf(mine, STATUS_LINE), "fill")).toEqual(
		mine,
	);
});

const login = (tiers: Json): Json => ({ oauthAccount: tiers });

for (const [tiers, cap] of [
	[{ organizationType: "claude_pro" }, "3"],
	[{ organizationRateLimitTier: "default_claude_max_5x" }, "4"],
	[{ organizationRateLimitTier: "default_claude_max_20x" }, undefined],
	[{}, undefined],
] as const) {
	test(`a login of ${JSON.stringify(tiers)} caps subagents at ${cap ?? "nothing"}`, () => {
		const group = capGroup(login(tiers));

		expect(
			group &&
				valueAt(group.settings, [
					"env",
					"CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS",
				]),
		).toBe(cap);
	});
}

test("no login record writes no cap", () => {
	expect(capGroup(undefined)).toBeUndefined();
});

const groupNamed = (label: string) => {
	const found = GROUPS.find((g) => g.label === label);
	if (found === undefined) {
		throw new Error(`no ${label} group`);
	}
	return found;
};

test("the groups are labelled and explained in order", () => {
	expect(GROUPS.map((g) => g.label)).toEqual([
		"Smaller prompt",
		"Auto mode",
		"Models and windows",
		"Worktrees",
		"Features off",
		"Sandbox",
		"Status line",
	]);
	expect(groupNamed("Smaller prompt").why).toContain(
		"denies Workflow, ScheduleWakeup, ReportFindings, CronCreate, CronDelete, CronList, EnterPlanMode, ExitPlanMode, allows read-only git",
	);
	expect(groupNamed("Smaller prompt").why).toContain("claudetto:Concise");
	expect(groupNamed("Auto mode").why).toContain("shorter set");
	expect(groupNamed("Models and windows").why).toContain(
		"claude-opus-5-5 as the main model at medium effort, claude-sonnet-5-5 for subagents",
	);
	expect(groupNamed("Features off").why).toContain("sets the version floor");
	expect(STATUS_LINE.why).toContain("cache countdown");
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

test("the sandbox group lists what is dangerous: home-wide writes, denies for files that run later and for secret stores, any host, service, and local port", () => {
	// `~/.ssh` and `~/.gnupg` stay readable for commit signing; "the sandbox's denyRead leaves the signing keys readable" pins that.
	expect(groupNamed("Sandbox").settings).toEqual({
		sandbox: {
			enabled: true,
			allowUnsandboxedCommands: false,
			enableWeakerNetworkIsolation: true,
			excludedCommands: ["ps *", "top *", "sysctl *", "launchctl list"],
			filesystem: {
				allowWrite: ["~/", "/Volumes/", "/private/tmp"],
				denyWrite: words(
					"~/.zshrc ~/.zshenv ~/.zprofile ~/.bashrc ~/.bash_profile ~/.profile ~/.config/fish ~/.gitconfig ~/.config/git ~/.ssh ~/Library/LaunchAgents ~/.local/bin ~/.bun/bin ~/bin",
				),
				denyRead: words("~/Library/Keychains ~/.aws ~/.azure ~/.config/gcloud ~/.netrc ~/.git-credentials"),
			},
			network: {
				allowedDomains: ["*"],
				allowMachLookup: ["*"],
				allowLocalBinding: true,
			},
		},
	});
});

test("a sandbox list the user holds stays under fill", () => {
	const group = groupNamed("Sandbox");
	const held = { sandbox: { filesystem: { allowWrite: ["~/mine"] } } };

	const written = applyChanges(held, changesOf(held, group), "fill");

	expect(valueAt(written, ["sandbox", "filesystem", "allowWrite"])).toEqual([
		"~/mine",
	]);
	expect(valueAt(written, ["sandbox", "enabled"])).toBe(true);
});

test("a null value in the user's file is replaced, not walked into", () => {
	const group = groupNamed("Worktrees");
	const held = { worktree: null };

	const changes = changesOf(held, group);

	expect(changes).toEqual([
		{ path: "worktree.baseRef", had: undefined, wanted: "head" },
	]);
	expect(applyChanges(held, changes, "fill")).toEqual({
		worktree: { baseRef: "head" },
	});
	expect(parseSettings("null")).toBeUndefined();
});

test("only a permission list merges; another list is replaced", () => {
	const models = groupNamed("Models and windows");
	const held = { fallbackModel: ["mine"] };

	expect(
		valueAt(applyChanges(held, changesOf(held, models), "replace"), [
			"fallbackModel",
		]),
	).toEqual(["claude-sonnet-5-5"]);
});

test("a deny list gains our rules after the user's, and fill adds the rules a list lacks", () => {
	const held = { permissions: { deny: ["Mine"], allow: ["Bash(ls)"] } };
	const prompt = groupNamed("Smaller prompt");
	const filled = applyChanges(held, changesOf(held, prompt), "fill");

	expect(valueAt(filled, ["permissions", "deny"])).toEqual([
		"Mine",
		...DENIED_TOOLS,
	]);
	expect(valueAt(filled, ["permissions", "allow"])).toEqual([
		"Bash(ls)",
		"Bash(git status *)",
		"Bash(git diff)",
		"Bash(git log)",
		"Bash(git show)",
	]);
});

test("a plan is found in either tier field, and only by a string name", () => {
	const cap = (tiers: Json) =>
		valueAt(capGroup(login(tiers))?.settings, [
			"env",
			"CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS",
		]);

	expect(
		cap({
			organizationRateLimitTier: "default_claude_max_20x",
			organizationType: "claude_pro",
		}),
	).toBe("3");
	expect(cap({ organizationType: ["claude_pro"] })).toBeUndefined();
	expect(capGroup({ oauthAccount: "claude_pro" })).toBeUndefined();
});

test("the cap group is labelled and names the cap and the plan", () => {
	const group = capGroup(login({ organizationType: "claude_pro" }));

	expect(group?.label).toBe("Subagent cap");
	expect(group?.why).toContain(
		"at once at 3: the claude_pro plan has a 5-hour window",
	);
});

test("the sandbox's denyRead leaves the signing keys readable", () => {
	const denyRead = valueAt(everything({}), [
		"sandbox",
		"filesystem",
		"denyRead",
	]);
	expect(Array.isArray(denyRead) && denyRead.length > 0).toBe(true);
	expect(JSON.stringify(denyRead)).not.toMatch(SIGNING_KEYS);
});
