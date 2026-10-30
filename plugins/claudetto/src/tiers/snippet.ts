// The settings a tier row asks setup to write, as one object in the shape of `settings.json`.

import { autoModeSnippet } from "../automode/automode.ts";
import { autoModeFaults } from "../automode/faults.ts";
import { builtinSnippet } from "../builtins.ts";
import { denyList } from "../deny.ts";
import { compactionSnippet, type Value } from "../keys.ts";
import { MAIN_AGENT, STYLE } from "../prompts.ts";
import { sandboxFaults } from "../sandbox/faults.ts";
import { sandboxSnippet } from "../sandbox/sandbox.ts";
import { pctFor } from "../threshold.ts";
import { HAIKU_MODEL, type TierRow } from "./tiers.ts";

/** A settings value: a scalar, a list of them, or an object of either. */
export type Node =
	| Value
	| readonly Value[]
	| { readonly [key: string]: Node | undefined };

/** The settings object for a tier row, keyed as `settings.json` is: an `env` block and top-level keys. */
export type TierSnippet = Readonly<Record<string, unknown>>;

/** A key that setup leaves out of the snippet because a default already covers it. */
export interface DroppedKey {
	readonly name: string;
	readonly why: string;
	/** The `clawdipedia` route that was read. */
	readonly route: string;
}

/** The keys that `tierSnippet` leaves out on purpose, each with the reason and the route read. Today the one is `CLAUDE_CODE_PROMPT_CACHE_TTL`. */
export const DROPPED_KEYS: readonly DroppedKey[] = [
	{
		name: "CLAUDE_CODE_PROMPT_CACHE_TTL",
		why: "Unset is 1 hour on a subscription, so the key does nothing there, and on an API key or a cloud provider it forces the costlier 1-hour write over the 5-minute default.",
		route: "configure/settings/model",
	},
];

/** One finding of the checks on a block of the snippet, as the setup report prints it. */
const faultLine = (
	block: string,
	fault: { readonly rule: string; readonly where: string },
): string => `${block}: ${fault.rule} at ${fault.where}`;

/**
 * The findings of the checks that guard the two blocks setup composes from another folder, as one
 * line each. A block with a finding is left out of `tierSnippet` and named here, because a fault of
 * these two is reported and never repaired (`../automode/faults.ts`, `../sandbox/faults.ts`).
 */
export const snippetFaults = (): readonly string[] => [
	...autoModeFaults(autoModeSnippet()).map((fault) =>
		faultLine("autoMode", fault),
	),
	...sandboxFaults(sandboxSnippet(), process.platform).map((fault) =>
		faultLine("sandbox", fault),
	),
];

/** The `autoMode` block, or no key at all when a check of `../automode/faults.ts` finds a fault in it. */
const autoModeBlock = (): TierSnippet => {
	const snippet = autoModeSnippet();
	return autoModeFaults(snippet).length === 0
		? { autoMode: snippet.autoMode }
		: {};
};

/** The `sandbox` block for the running platform, or no key at all when a check of `../sandbox/faults.ts` finds a fault in it. */
const sandboxBlock = (): TierSnippet => {
	const snippet = sandboxSnippet();
	return sandboxFaults(snippet, process.platform).length === 0
		? { sandbox: snippet.sandbox }
		: {};
};

/**
 * What a row writes. A field the row leaves unset writes no key, so the harness keeps its own value.
 * The Haiku window sits in `modelSettings` because the env window would move every model.
 *
 * `permissions.deny` ships with the two switches of `builtinSnippet` and never apart from them:
 * `disableBundledSkills` alone is a loss, because it moves the workflow text into the `Workflow`
 * definition while that tool is still offered. The two switches alone read 52,254 characters against
 * 42,879 for a stock run; with the deny list, 31,861 (`../cuts.ts`).
 */
export const tierSnippet = (row: TierRow): TierSnippet => ({
	...builtinSnippet(),
	...compactionSnippet().settings,
	permissions: { deny: [...denyList()] },
	agent: MAIN_AGENT,
	outputStyle: STYLE,
	...autoModeBlock(),
	...sandboxBlock(),
	env: {
		CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: pctFor(
			row.contextCap,
			row.handoffTokens,
		).toFixed(4),
		...(row.subagentModel === undefined
			? {}
			: { CLAUDE_CODE_SUBAGENT_MODEL: row.subagentModel }),
	},
	autoCompactWindow: row.contextCap,
	modelSettings: { [HAIKU_MODEL]: { autoCompactWindow: row.haiku.contextCap } },
	...(row.mainModel === undefined ? {} : { model: row.mainModel }),
	...(row.effort === undefined ? {} : { effortLevel: row.effort }),
});
