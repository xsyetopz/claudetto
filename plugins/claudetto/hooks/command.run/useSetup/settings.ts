import { SILENT_TURN_REMINDER } from "../../texts";
import { isRecord } from "../../tools";
import { AUTO_MODE } from "./auto-mode";
import { COMMAND_RULES } from "./command-rules";

const HAIKU = "claude-haiku-5-5";
const SONNET = "claude-sonnet-5-5";
const OPUS = "claude-opus-5-5";

export type Json = Record<string, unknown>;

export interface Group {
	readonly label: string;
	readonly why: string;
	readonly settings: Json;
	/** Lists whose entries an earlier setup wrote and this one removes; the user's other entries stay. */
	readonly retired?: Json;
}

export const MINIMUM_VERSION = "2.1.323";

// User settings do not expand `${CLAUDE_PLUGIN_ROOT}`, and the plugin cache holds one folder per version, so the shell picks the newest at each run.
const LAUNCHER = `$(ls -d "\${CLAUDE_CONFIG_DIR:-$HOME/.claude}"/plugins/cache/xsyetopz/claudetto/*/ | sort -V | tail -1)bin/claudetto-statusline`;

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
	"claude-test",
];

// The agent types Claude Code ships; the claudetto agents are namespaced, so `Agent(Plan)` leaves `claudetto:Metis` alone.
const BUILTIN_AGENTS = [
	"claude",
	"Explore",
	"general-purpose",
	"Plan",
	"statusline-setup",
	"claude-code-guide",
];

export const DENIED_TOOLS = [
	...BUILTIN_AGENTS.map((name) => `Agent(${name})`),
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
	COMMAND_RULES,
	{
		label: "Auto mode",
		why: "Replaces the built-in autoMode rule lists, so the auto-mode classifier blocks only unrecoverable destruction and lets every other action through.",
		settings: { autoMode: AUTO_MODE },
	},
	{
		label: "Models and windows",
		why: `Writes ${OPUS} as the main model at medium effort, ${SONNET} for subagents and as the fallback, effort ceilings per model, a one hour prompt cache for subagents, and the Haiku context window.`,
		settings: {
			model: OPUS,
			effortLevel: "medium",
			fallbackModel: [SONNET],
			modelSettings: {
				[OPUS]: { maxEffortLevel: "high" },
				[SONNET]: { maxEffortLevel: "medium" },
				[HAIKU]: { maxEffortLevel: "high", autoCompactWindow: 200_000 },
			},
			idleCompaction: false,
			subagentPromptCacheTtl: "1h",
			env: {
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
		label: "Output limits",
		why: "Caps a Bash result at 8000 characters and an MCP tool result at 10000 tokens; Claude Code saves a longer result to its own file and shows a preview.",
		settings: {
			bashOutputMaxChars: 8000,
			env: { MAX_MCP_OUTPUT_TOKENS: "10000" },
		},
	},
	{
		label: "Features off",
		why: "Turns off workflows, artifacts, Remote Control, the claude.ai integrations, push notifications, auto memory, prompt suggestions, tips, voice, the to-do list, cron, fast mode, subagents that start subagents, a background subagent silent for 15 minutes, the advisor tool, telemetry, error reporting, git instructions, commit attribution, and the feedback prompts; sets the version floor.",
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
				// A background subagent with no progress for 15 minutes is ended; the key counts silence, not run time.
				CLAUDE_ASYNC_AGENT_STALL_TIMEOUT_MS: "900000",
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
		why: "Turns the sandbox off: it cannot sandbox only dangerous commands, so the command rules and auto mode stop unrecoverable destruction.",
		settings: { sandbox: { enabled: false } },
	},
	STATUS_LINE,
];

// A status line is one command with its options, so a user's own line stays whole.
const WHOLE = "statusLine";

export const leaves = (
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

export const setAt = (
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
