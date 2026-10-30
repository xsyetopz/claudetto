import { builtinSnippet } from "../builtins.ts";
import {
	CLASSIFIER_CALL_CHARS,
	SANDBOX_CHARS,
	SHIPPED_TOOL_COUNT,
	SHIPPED_TOTAL,
} from "../cuts.ts";
import { BASELINE_TOOL_COUNT, BASELINE_TOTAL, denyList } from "../deny.ts";
import { count } from "../format.ts";
import { AUTOCOMPACT_PCT_ENV, compactionSnippet, ENV } from "../keys.ts";
import { MAIN_AGENT, STYLE } from "../prompts.ts";
import { SECRET_PATHS } from "../sandbox/sandbox.ts";
import { AGENT_DENIES, INTEGRATION_DENIES } from "./agents.ts";
import { ALLOW_RULES } from "./allow.ts";
import { disablesSnippet, FALLBACK_MODELS, MAX_EFFORT } from "./disables.ts";
import { envFlags, SUBAGENT_MODEL_ENV } from "./env.ts";
import type { TierSnippet } from "./snippet.ts";
import { SNIPPET_ROW } from "./tiers.ts";

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

/** The path a group names for one flag of the `env` block. */
const envPath = (name: string): string => `${ENV}.${name}`;

const codes = (items: readonly string[]): string =>
	items.map((item) => `\`${item}\``).join(", ");

export const UNSHIPPED_KEYS: readonly string[] = ["autoMode"];

export interface KeyGroup {
	readonly label: string;
	readonly why: string;
	readonly keys: readonly string[];
}

export const KEY_GROUPS: readonly KeyGroup[] = [
	{
		label: "Smaller prompt",
		why: `Turns off the bundled skills and most built-in plugins, denies ${codes([...denyList(), ...INTEGRATION_DENIES])} and the ${AGENT_DENIES.length} built-in agents, allows ${codes(ALLOW_RULES)}, and selects the \`${MAIN_AGENT}\` agent body and the \`${STYLE}\` output style. With the other groups they take the first request from ${count(BASELINE_TOTAL)} characters to ${count(SHIPPED_TOTAL)}, and the tool schemas from ${BASELINE_TOOL_COUNT} to ${SHIPPED_TOOL_COUNT}.`,
		keys: [
			...Object.keys(builtinSnippet()),
			"permissions",
			"agent",
			"outputStyle",
		],
	},
	{
		label: "Sandbox",
		why: `Runs a \`Bash\` command inside the sandbox with \`allowUnsandboxedCommands\` set to \`false\`, and keeps it out of ${codes(SECRET_PATHS)}. It costs ${count(SANDBOX_CHARS)} characters of the first request and repays them, because a sandboxed command is auto-allowed before the auto-mode classifier runs and one classifier call is ${count(CLASSIFIER_CALL_CHARS)} characters.`,
		keys: ["sandbox"],
	},
	{
		label: "Models and windows",
		why: `Writes \`${SNIPPET_ROW.mainModel}\` as the main model at \`${SNIPPET_ROW.effort}\` effort, \`${SNIPPET_ROW.subagentModel}\` for subagents, ${codes(FALLBACK_MODELS)} as the fallback model, the effort ceilings ${codes(Object.entries(MAX_EFFORT).map(([model, level]) => `${model}: ${level}`))}, and the context windows and compaction thresholds the handoff is written against.`,
		keys: [
			"model",
			"effortLevel",
			envPath(AUTOCOMPACT_PCT_ENV),
			envPath(SUBAGENT_MODEL_ENV),
			...Object.keys(compactionSnippet().settings),
			"fallbackModel",
			"modelSettings",
		],
	},
	{
		label: "Features off",
		why: `Writes ${codes(Object.keys(disablesSnippet()))} and the \`env\` flags ${codes(Object.keys(envFlags()))}, which turn off workflows, artifacts, Remote Control, the claude.ai integrations and push notifications, auto memory, prompt suggestions, tips, voice, the to-do list, cron, fast mode, the advisor tool, the IDE auto-install, error reporting, the git instructions, commit attribution, and the feedback prompts or set the usage-limit, model-switch, plan, cross-session, and motion behaviors. It also names the settings schema for editors.`,
		keys: [
			"$schema",
			...Object.keys(disablesSnippet()),
			...Object.keys(envFlags()).map(envPath),
		],
	},
];

export const groupLabels = (): readonly string[] =>
	KEY_GROUPS.map((group) => group.label);

export const groupedKeys = (): readonly string[] =>
	KEY_GROUPS.flatMap((group) => group.keys);

export const keyPaths = (snippet: TierSnippet): readonly string[] =>
	Object.entries(snippet).flatMap(([key, value]) =>
		key === ENV && isRecord(value) ? Object.keys(value).map(envPath) : [key],
	);

export const keptSnippet = (
	snippet: TierSnippet,
	kept: readonly string[],
): TierSnippet => {
	const keys = new Set(
		KEY_GROUPS.filter((group) => kept.includes(group.label)).flatMap(
			(group) => group.keys,
		),
	);
	const env = snippet[ENV];
	const keptEnv = isRecord(env)
		? Object.entries(env).filter(([name]) => keys.has(envPath(name)))
		: [];
	return {
		...Object.fromEntries(
			Object.entries(snippet).filter(([key]) => key !== ENV && keys.has(key)),
		),
		...(keptEnv.length === 0 ? {} : { [ENV]: Object.fromEntries(keptEnv) }),
	};
};
