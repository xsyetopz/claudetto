import { autoModeSnippet } from "../automode/automode.ts";
import { autoModeFaults } from "../automode/faults.ts";
import { builtinSnippet } from "../builtins.ts";
import { denyFaults, denyList } from "../deny.ts";
import { AUTOCOMPACT_PCT_ENV, compactionSnippet, type Value } from "../keys.ts";
import { MAIN_AGENT, STYLE } from "../prompts.ts";
import { sandboxFaults } from "../sandbox/faults.ts";
import { sandboxSnippet } from "../sandbox/sandbox.ts";
import { pctFor } from "../threshold.ts";
import { AGENT_DENIES, INTEGRATION_DENIES } from "./agents.ts";
import { ALLOW_RULES, ruleFaults } from "./allow.ts";
import { disablesSnippet, FALLBACK_MODELS, MAX_EFFORT } from "./disables.ts";
import { envFlags, SUBAGENT_MODEL_ENV } from "./env.ts";
import { statusLineSnippet } from "./status-line.ts";
import { HAIKU_MODEL, type TierRow } from "./tiers.ts";

export type Node =
	| Value
	| readonly Value[]
	| { readonly [key: string]: Node | undefined };

export type TierSnippet = Readonly<Record<string, unknown>>;

export const SETTINGS_SCHEMA =
	"https://clawdipedia.cc/schemas/claude-code-settings.json";

export interface DroppedKey {
	readonly name: string;
	readonly why: string;
	readonly route: string;
}

export const DROPPED_KEYS: readonly DroppedKey[] = [
	{
		name: "CLAUDE_CODE_PROMPT_CACHE_TTL",
		why: "Unset is 1 hour on a subscription, so the key does nothing there, and on an API key or a cloud provider it forces the costlier 1-hour write over the 5-minute default.",
		route: "configure/settings/model",
	},
];

export const denyRules = (): readonly string[] => [
	...denyList(),
	...INTEGRATION_DENIES,
	...AGENT_DENIES,
];

const faultLine = (
	block: string,
	fault: { readonly rule: string; readonly where: string },
): string => `${block}: ${fault.rule} at ${fault.where}`;

export const UNKNOWN_PLATFORM = "unknown";

export const snippetFaults = (platform: string): readonly string[] => [
	...autoModeFaults(autoModeSnippet()).map((fault) =>
		faultLine("autoMode", fault),
	),
	...sandboxFaults(sandboxSnippet(platform), platform).map((fault) =>
		faultLine("sandbox", fault),
	),
	...ruleFaults(ALLOW_RULES).map((rule) =>
		faultLine("permissions", { rule, where: "permissions.allow" }),
	),
	...denyFaults(denyRules()).map((rule) =>
		faultLine("permissions", { rule, where: "permissions.deny" }),
	),
];

export const cleanBlock = (
	block: TierSnippet,
	faults: readonly string[],
): TierSnippet => (faults.length === 0 ? block : {});

const allowBlock = (): TierSnippet =>
	cleanBlock({ allow: [...ALLOW_RULES] }, ruleFaults(ALLOW_RULES));

const denyBlock = (): TierSnippet =>
	cleanBlock({ deny: [...denyRules()] }, denyFaults(denyRules()));

const autoModeBlock = (): TierSnippet => {
	const snippet = autoModeSnippet();
	return autoModeFaults(snippet).length === 0
		? { autoMode: snippet.autoMode }
		: {};
};

const sandboxBlock = (platform: string): TierSnippet => {
	const snippet = sandboxSnippet(platform);
	return sandboxFaults(snippet, platform).length === 0
		? { sandbox: snippet.sandbox }
		: {};
};

const modelSettingsOf = (row: TierRow): TierSnippet => {
	const ceilings = Object.fromEntries(
		Object.entries(MAX_EFFORT).map(([model, level]) => [
			model,
			{ maxEffortLevel: level },
		]),
	);
	return {
		...ceilings,
		[HAIKU_MODEL]: {
			...ceilings[HAIKU_MODEL],
			autoCompactWindow: row.haiku.contextCap,
		},
	};
};

export const tierSnippet = (row: TierRow, platform: string): TierSnippet => ({
	$schema: SETTINGS_SCHEMA,
	...builtinSnippet(),
	...disablesSnippet(),
	...compactionSnippet().settings,
	permissions: { ...allowBlock(), ...denyBlock() },
	agent: MAIN_AGENT,
	outputStyle: STYLE,
	...autoModeBlock(),
	...sandboxBlock(platform),
	env: {
		...envFlags(),
		[AUTOCOMPACT_PCT_ENV]: pctFor(row.contextCap, row.handoffTokens).toFixed(4),
		...(row.subagentModel === undefined
			? {}
			: { [SUBAGENT_MODEL_ENV]: row.subagentModel }),
	},
	autoCompactWindow: row.contextCap,
	fallbackModel: [...FALLBACK_MODELS],
	modelSettings: modelSettingsOf(row),
	...(row.mainModel === undefined ? {} : { model: row.mainModel }),
	...(row.effort === undefined ? {} : { effortLevel: row.effort }),
	...statusLineSnippet(),
});
