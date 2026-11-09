import { wallRule } from "../gate/walled.ts";
import { SILENT_TURN_REMINDER } from "../texts.ts";
import { AUTO_MODE } from "./auto-mode.ts";

const HAIKU = "claude-haiku-5-5";
const SONNET = "claude-sonnet-5-5";
const OPUS = "claude-opus-5-5";

export type Json = Record<string, unknown>;

export interface Group {
	readonly label: string;
	readonly why: string;
	readonly settings: Json;
}

export const MINIMUM_VERSION = "2.1.318";

// User settings do not expand `${CLAUDE_PLUGIN_ROOT}`, and the plugin cache holds one folder per version, so the shell picks the newest at each run.
const LAUNCHER = `$(ls -d "\${CLAUDE_CONFIG_DIR:-$HOME/.claude}"/plugins/cache/claudetto/claudetto/*/ | sort -V | tail -1)bin/claudetto-statusline`;

const STATUS_LINE_COMMAND = `bun --no-env-file "${LAUNCHER}"`;

export const STATUS_LINE: Group = {
	label: "Status line",
	why: "Shows the model, effort, context window, usage limits, and cache countdown.",
	settings: {
		statusLine: {
			type: "command",
			command: STATUS_LINE_COMMAND,
			refreshInterval: 5,
		},
	},
};

const BUILTIN_PLUGINS_OFF = [
	"agents-md",
	"plugin-authoring",
	"mods-guide",
	"tips",
	"mermaid",
	"responsive-mode",
	"diff",
	"you-should-know",
	"easel",
	"claude-platform",
	"claude-test",
];

export const DENIED_TOOLS = [
	"Workflow",
	"ScheduleWakeup",
	"ReportFindings",
	"CronCreate",
	"CronDelete",
	"CronList",
	"EnterPlanMode",
	"ExitPlanMode",
];

export const GROUPS: readonly Group[] = [
	{
		label: "Smaller prompt",
		why: `Turns off the bundled skills and most built-in plugins, denies ${DENIED_TOOLS.join(", ")}, allows read-only git, and selects the claudetto:Concise output style, so the first request is smaller.`,
		settings: {
			disableBundledSkills: true,
			enabledPlugins: Object.fromEntries(
				BUILTIN_PLUGINS_OFF.map((name) => [`cc-plugin-${name}@builtin`, false]),
			),
			permissions: {
				allow: [
					"Bash(git status *)",
					"Bash(git diff)",
					"Bash(git log)",
					"Bash(git show)",
				],
				deny: DENIED_TOOLS,
			},
			outputStyle: "claudetto:Concise",
		},
	},
	{
		label: "Auto mode",
		why: "Replaces the built-in autoMode rule lists with a shorter set, so the auto-mode classifier reads fewer rules.",
		settings: { autoMode: AUTO_MODE },
	},
	{
		label: "Models and windows",
		why: `Writes ${OPUS} as the main model at medium effort, ${SONNET} for subagents and as the fallback, effort ceilings per model, a one hour prompt cache for subagents, and the context windows with the compaction trigger the handoff is written against.`,
		settings: {
			model: OPUS,
			effortLevel: "medium",
			fallbackModel: [SONNET],
			modelSettings: {
				[OPUS]: { maxEffortLevel: "high" },
				[SONNET]: { maxEffortLevel: "medium" },
				[HAIKU]: { maxEffortLevel: "high", autoCompactWindow: 200_000 },
			},
			autoCompactWindow: 300_000,
			idleCompaction: false,
			subagentPromptCacheTtl: "1h",
			env: {
				// 140,000 tokens of the 300,000 window less its 20,000 output reserve.
				CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: "50.0000",
				CLAUDE_CODE_SUBAGENT_MODEL: SONNET,
				ANTHROPIC_DEFAULT_MODEL: OPUS,
				ANTHROPIC_DEFAULT_OPUS_MODEL: OPUS,
				ANTHROPIC_DEFAULT_SONNET_MODEL: SONNET,
				ANTHROPIC_DEFAULT_HAIKU_MODEL: HAIKU,
			},
		},
	},
	{
		label: "Worktrees",
		why: 'Starts a worktree at the current branch with its unpushed commits (`worktree.baseRef: "head"`); unset, Claude Code starts it at `origin/<default branch>`.',
		settings: { worktree: { baseRef: "head" } },
	},
	{
		label: "Features off",
		why: "Turns off workflows, artifacts, Remote Control, the claude.ai integrations, push notifications, auto memory, prompt suggestions, tips, voice, the to-do list, cron, fast mode, subagents that start subagents, the advisor tool, telemetry, error reporting, git instructions, commit attribution, and the feedback prompts; sets the version floor.",
		settings: {
			$schema: "https://clawdipedia.cc/schemas/claude-code-settings.json",
			minimumVersion: MINIMUM_VERSION,
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
				// The server's text asks "say in a few words what you're doing", which draws a narration line.
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
		},
	},
	{
		label: "Sandbox",
		why: "Turns on the built-in sandbox with least friction: Bash writes anywhere in your home folder, mounted volumes, and the temp folder, except the files that run later (shell startup files, git config, SSH, launch agents, and the PATH folders in your home folder). It reads no cloud credential or keychain file, and leaves your SSH and GPG keys readable so signed commits work, reaches any host and system service without a prompt, runs ps, top, sysctl, and launchctl list outside the sandbox, and cannot retry outside the sandbox.",
		settings: {
			sandbox: {
				enabled: true,
				allowUnsandboxedCommands: false,
				// Read-only commands that fail sandboxed under every key: `ps` and `top` are setuid root, and `sysctl` reads a fixed name list.
				excludedCommands: ["ps *", "top *", "sysctl *", "launchctl list"],
				filesystem: {
					// The sandbox does not follow the `/tmp` link on macOS, so only the real path opens it.
					allowWrite: ["~/", "/Volumes/", "/private/tmp"],
					denyWrite: [
						"~/.zshrc",
						"~/.zshenv",
						"~/.zprofile",
						"~/.bashrc",
						"~/.bash_profile",
						"~/.profile",
						"~/.config/fish",
						"~/.gitconfig",
						"~/.config/git",
						"~/.ssh",
						"~/Library/LaunchAgents",
						"~/.local/bin",
						"~/.bun/bin",
						"~/bin",
					],
					denyRead: [
						"~/Library/Keychains",
						"~/.aws",
						"~/.azure",
						"~/.config/gcloud",
						"~/.netrc",
						"~/.git-credentials",
					],
				},
				// A test server or a fake API binds a localhost port.
				network: {
					allowedDomains: ["*"],
					allowMachLookup: ["*"],
					allowLocalBinding: true,
				},
			},
		},
	},
	STATUS_LINE,
];

export interface Change {
	readonly path: string;
	readonly had: unknown;
	readonly wanted: unknown;
}

const isRecord = (value: unknown): value is Json =>
	typeof value === "object" && value !== null && !Array.isArray(value);

// A status line is one command with its options, so a user's own line stays whole.
const WHOLE = "statusLine";

const leaves = (
	node: Json,
	path: readonly string[] = [],
): { path: readonly string[]; value: unknown }[] =>
	Object.entries(node).flatMap(([key, value]) =>
		isRecord(value) && key !== WHOLE
			? leaves(value, [...path, key])
			: [{ path: [...path, key], value }],
	);

export const valueAt = (
	settings: unknown,
	path: readonly string[],
): unknown => {
	const [key, ...rest] = path;
	if (key === undefined) {
		return settings;
	}
	return isRecord(settings) ? valueAt(settings[key], rest) : undefined;
};

const setAt = (
	settings: Json,
	path: readonly string[],
	value: unknown,
): Json => {
	const [key, ...rest] = path;
	if (key === undefined) {
		return settings;
	}
	const child = settings[key];
	return {
		...settings,
		[key]:
			rest.length === 0
				? value
				: setAt(isRecord(child) ? child : {}, rest, value),
	};
};

const same = (a: unknown, b: unknown): boolean =>
	JSON.stringify(a) === JSON.stringify(b);

const isPermissionList = (path: readonly string[]): boolean =>
	path[0] === "permissions";

/** A permission list keeps every rule the user holds and adds ours. */
const wantedAt = (path: readonly string[], had: unknown, value: unknown) =>
	isPermissionList(path) && Array.isArray(had) && Array.isArray(value)
		? [...had, ...value.filter((rule) => !had.includes(rule))]
		: value;

export const changesOf = (held: Json, group: Group): readonly Change[] =>
	leaves(group.settings).flatMap(({ path, value }) => {
		const had = valueAt(held, path);
		const wanted = wantedAt(path, had, value);
		return same(had, wanted) ? [] : [{ path: path.join("."), had, wanted }];
	});

/** `fill` writes the keys the user has not set and the rules a list lacks; `replace` writes the others too. */
export const applyChanges = (
	held: Json,
	changes: readonly Change[],
	mode: "fill" | "replace",
): Json => {
	let settings = held;
	for (const change of changes) {
		if (
			mode === "replace" ||
			change.had === undefined ||
			change.path.startsWith("permissions.")
		) {
			settings = setAt(settings, change.path.split("."), change.wanted);
		}
	}
	return settings;
};

// The plan's internal names in the login record. Ultra (`default_claude_max_20x`) has no 5-hour window, so it gets no cap; the caps are the author's choice.
const SUBAGENT_CAPS: Readonly<Record<string, number>> = {
	claude_pro: 3,
	default_claude_max_5x: 4,
};

/** The subagent cap group for the plan in the login record, or `undefined` for Ultra, an API key, or a plan claudetto has no cap for. */
export const capGroup = (login: Json | undefined): Group | undefined => {
	const account = login?.["oauthAccount"];
	const plan = (
		isRecord(account)
			? [account["organizationRateLimitTier"], account["organizationType"]]
			: []
	).find(
		(name): name is string =>
			typeof name === "string" && Object.hasOwn(SUBAGENT_CAPS, name),
	);
	const cap = plan === undefined ? undefined : SUBAGENT_CAPS[plan];
	return cap === undefined
		? undefined
		: {
				label: "Subagent cap",
				why: `Caps the subagents that run at once at ${cap}: the ${plan} plan has a 5-hour window, and each subagent spends from it.`,
				settings: {
					env: { CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS: String(cap) },
				},
			};
};

/** The gate's wall vanishes with the plugin; a deny rule in the settings outlives it. */
export const wallGroup = (walls: readonly string[]): Group | undefined =>
	walls.length === 0
		? undefined
		: {
				label: "Protected paths",
				why: `Denies Read under ${walls.join(", ")}, the protectedPaths option, so Claude Code blocks the read even without the plugin and the startup notice stays silent.`,
				settings: { permissions: { deny: walls.map(wallRule) } },
			};

export const settingsText = (settings: Json): string =>
	`${JSON.stringify(settings, undefined, 2)}\n`;

/** The settings a file holds, `{}` for no file, or `undefined` when the text is not a JSON object. */
export const parseSettings = (text: string | undefined): Json | undefined => {
	if (text === undefined) {
		return {};
	}
	try {
		const parsed: unknown = JSON.parse(text);
		return isRecord(parsed) ? parsed : undefined;
	} catch {
		return undefined;
	}
};
