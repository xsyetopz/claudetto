import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { file } from "bun";
import { MINIMUM_VERSION } from "../disables.ts";
import { denyRulesOf } from "../keys.ts";
import { tierSnippet } from "../snippet.ts";
import { SNIPPET_ROW, TIERS } from "../tiers.ts";

const SCHEMA = join(
	import.meta.dir,
	"..",
	"..",
	"..",
	"..",
	"..",
	"docs",
	"keep",
	"settings",
	"claude-code-settings.schema.json",
);

const ENV = {
	CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS: "1",
	CLAUDE_CODE_DISABLE_CFC_PROMPT: "1",
	CLAUDE_CODE_DISABLE_ADVISOR_TOOL: "1",
	CLAUDE_CODE_DISABLE_CRON: "1",
	CLAUDE_CODE_FORK_SUBAGENT: "0",
	CLAUDE_CODE_AUTO_CONNECT_IDE: "false",
	CLAUDE_CODE_DISABLE_TERMINAL_TITLE: "1",
	CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY: "1",
	DISABLE_ERROR_REPORTING: "1",
	DISABLE_EXTRA_USAGE_COMMAND: "1",
	DISABLE_FEEDBACK_COMMAND: "1",
	DISABLE_INSTALL_GITHUB_APP_COMMAND: "1",
	CLAUDE_CODE_DISABLE_FAST_MODE: "1",
	ENABLE_CLAUDEAI_MCP_SERVERS: "false",
	CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS: "1",
	CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL: "1",
	CLAUDE_CODE_THRIFTY_SONIC: "0",
};

const AGENT_DENIES = [
	"Agent(general-purpose)",
	"Agent(Explore)",
	"Agent(Plan)",
	"Agent(claude)",
	"Agent(claude-code-guide)",
	"Agent(statusline-setup)",
];

describe("the keys setup writes", () => {
	for (const row of TIERS) {
		const snippet = tierSnippet(row, "darwin");

		test(`${row.tier}: every env flag is written, the unofficial one included`, () => {
			const env = snippet["env"];

			expect(env).toMatchObject(ENV);
		});

		test(`${row.tier}: the \`/config\` disables and the version floor are written`, () => {
			const keys = {
				workflowSizeGuideline: snippet["workflowSizeGuideline"],
				workflowKeywordTriggerEnabled: snippet["workflowKeywordTriggerEnabled"],
				enableWorkflows: snippet["enableWorkflows"],
				enableArtifact: snippet["enableArtifact"],
				remoteControlAtStartup: snippet["remoteControlAtStartup"],
				minimumVersion: snippet["minimumVersion"],
			};

			expect(keys).toEqual({
				workflowSizeGuideline: "unrestricted",
				workflowKeywordTriggerEnabled: false,
				enableWorkflows: false,
				enableArtifact: false,
				remoteControlAtStartup: false,
				minimumVersion: MINIMUM_VERSION,
			});
		});

		test(`${row.tier}: the built-in agents are denied, after the tool denies`, () => {
			const deny = denyRulesOf(snippet);

			expect(deny.slice(-AGENT_DENIES.length)).toEqual(AGENT_DENIES);
		});
	}

	test("the claude.ai integrations are off, and `DesignSync` is denied", () => {
		const snippet = tierSnippet(SNIPPET_ROW, "darwin");
		const deny = denyRulesOf(snippet);

		expect(snippet).toMatchObject({
			disableClaudeAiConnectors: true,
			syncClaudeAiSkills: false,
			syncClaudeAiPlugins: false,
			autoUploadSessions: false,
		});
		expect(deny).toContain("DesignSync");
	});

	for (const row of TIERS) {
		const snippet = tierSnippet(row, "darwin");

		test(`${row.tier}: worktrees stay on and fast mode is off, since quality on a budget outranks speed`, () => {
			const deny = denyRulesOf(snippet);

			for (const tool of ["EnterWorktree", "ExitWorktree"]) {
				expect(deny.filter((rule) => rule.startsWith(tool))).toEqual([]);
			}
			expect(snippet).not.toHaveProperty("worktree");
			expect(snippet).toMatchObject({
				env: { CLAUDE_CODE_DISABLE_FAST_MODE: "1" },
			});
			expect(snippet).not.toHaveProperty("fastMode");
		});
	}

	for (const row of TIERS) {
		const snippet = tierSnippet(row, "darwin");

		test(`${row.tier}: remote control and the input-needed notice are off`, () => {
			expect(snippet).toMatchObject({
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
				fallbackModel: ["claude-sonnet-5-5"],
				autoContinueAtUsageLimit: true,
				switchModelsOnFlag: false,
				precomputeCompactionEnabled: false,
				showClearContextOnPlanAccept: true,
				useAutoModeDuringPlan: false,
				crossSessionInbound: "accept",
				prefersReducedMotion: true,
			});
		});

		test(`${row.tier}: the effort ceilings sit in \`modelSettings\` beside the Haiku window`, () => {
			expect(snippet["modelSettings"]).toEqual({
				"claude-opus-5-5": { maxEffortLevel: "high" },
				"claude-sonnet-5-5": { maxEffortLevel: "medium" },
				"claude-haiku-5-5": {
					maxEffortLevel: "high",
					autoCompactWindow: row.haiku.contextCap,
				},
			});
		});

		test(`${row.tier}: \`modelProposedGoals\` stays unset while \`/goal <cmd>\` is planned`, () => {
			expect(snippet).not.toHaveProperty("modelProposedGoals");
		});
	}

	test("$schema is the vendored schema's $id", async () => {
		const schema: unknown = await file(SCHEMA).json();

		const snippet = tierSnippet(SNIPPET_ROW, "darwin");

		expect(snippet["$schema"]).toBeString();
		expect(schema).toMatchObject({ $id: snippet["$schema"] });
	});
});
