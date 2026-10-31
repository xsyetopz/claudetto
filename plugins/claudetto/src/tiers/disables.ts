export const MINIMUM_VERSION = "2.1.316";

export const CONFIG_DISABLES = {
	workflowSizeGuideline: "unrestricted",
	workflowKeywordTriggerEnabled: false,
	enableWorkflows: false,
	enableArtifact: false,
	remoteControlAtStartup: false,
} as const;

export const CLAUDE_AI_DISABLES = {
	disableClaudeAiConnectors: true,
	syncClaudeAiSkills: false,
	syncClaudeAiPlugins: false,
	autoUploadSessions: false,
	disableRemoteControl: true,
	inputNeededNotifEnabled: false,
	agentPushNotifEnabled: false,
} as const;

export const SESSION_DISABLES = {
	autoMemoryEnabled: false,
	autoDreamEnabled: false,
	promptSuggestionEnabled: false,
	awaySummaryEnabled: false,
	spinnerTipsEnabled: false,
	feedbackDrafts: "off",
	feedbackSurveyRate: 0,
	todoFeatureEnabled: false,
	voiceEnabled: false,
} as const;

export const PROMPT_DISABLES = {
	includeGitInstructions: false,
	showThinkingSummaries: false,
	attribution: false,
} as const;

export const BEHAVIOR_KEYS = {
	autoContinueAtUsageLimit: true,
	switchModelsOnFlag: false,
	precomputeCompactionEnabled: false,
	showClearContextOnPlanAccept: true,
	useAutoModeDuringPlan: false,
	crossSessionInbound: "accept",
	prefersReducedMotion: true,
} as const;

export const FALLBACK_MODELS: readonly string[] = ["claude-sonnet-5-5"];

export const MAX_EFFORT: Readonly<Record<string, string>> = {
	"claude-opus-5-5": "high",
	"claude-sonnet-5-5": "medium",
	"claude-haiku-5-5": "high",
};

export const disablesSnippet = () => ({
	...CONFIG_DISABLES,
	...CLAUDE_AI_DISABLES,
	...SESSION_DISABLES,
	...PROMPT_DISABLES,
	...BEHAVIOR_KEYS,
	minimumVersion: MINIMUM_VERSION,
});
