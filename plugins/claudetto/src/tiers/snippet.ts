// The settings a tier row asks setup to write, as one object in the shape of `settings.json`.

import { autoModeSnippet } from "../automode/automode.ts";
import { autoModeFaults } from "../automode/faults.ts";
import { builtinSnippet } from "../builtins.ts";
import { denyFaults, denyList } from "../deny.ts";
import { compactionSnippet, type Value } from "../keys.ts";
import { MAIN_AGENT, STYLE } from "../prompts.ts";
import { sandboxFaults } from "../sandbox/faults.ts";
import { sandboxSnippet } from "../sandbox/sandbox.ts";
import { pctFor } from "../threshold.ts";
import { ALLOW_RULES, ruleFaults } from "./allow.ts";
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
 * A platform that the composer could not name. `sandboxSupported` refuses it, so `sandbox.enabled`
 * is left out and `offFaults` of `../sandbox/faults.ts` reports nothing: a snippet composed where
 * the platform is unknown claims no sandbox rather than claiming one that may not be there.
 * `onSetupCommand` passes it when its one `uname` call fails, and the plugin test environment,
 * which has no process at all, is such a place.
 */
export const UNKNOWN_PLATFORM = "unknown";

/**
 * The findings of the checks that guard the two blocks setup composes from another folder, as one
 * line each. A block with a finding is left out of `tierSnippet` and named here, because a fault of
 * these two is reported and never repaired (`../automode/faults.ts`, `../sandbox/faults.ts`).
 *
 * `platform` is named by the caller, as `process.platform` spells it, because a hooks module has no
 * `process` to read it from.
 */
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
	...denyFaults(denyList()).map((rule) =>
		faultLine("permissions", { rule, where: "permissions.deny" }),
	),
];

/**
 * `block` when `faults` is empty, and no key at all when it is not.
 *
 * Leaving the key out is what every check of the snippet does with a fault: the key the user already
 * has is kept, the report names the fault, and nothing repairs it (`../automode/faults.ts`,
 * `../sandbox/faults.ts`). Writing a block a check has faulted would write the fault.
 */
export const cleanBlock = (
	block: TierSnippet,
	faults: readonly string[],
): TierSnippet => (faults.length === 0 ? block : {});

/** The `allow` list, or no key at all when `ruleFaults` finds a rule setup refuses. */
const allowBlock = (): TierSnippet =>
	cleanBlock({ allow: [...ALLOW_RULES] }, ruleFaults(ALLOW_RULES));

/**
 * The `deny` list, or no key at all when `denyFaults` finds a name whose removal was measured to
 * raise the request.
 *
 * `../__tests__/deny.spec.ts` already fails on such a name, so this check is the second line: the
 * test guards the list as written here, and this guards what setup writes, the way the `allow`,
 * `autoMode`, and `sandbox` blocks each do. Without it the one key of the snippet that trims the
 * tool surface was also the one key with no run-time guard.
 */
const denyBlock = (): TierSnippet =>
	cleanBlock({ deny: [...denyList()] }, denyFaults(denyList()));

/** The `autoMode` block, or no key at all when a check of `../automode/faults.ts` finds a fault in it. */
const autoModeBlock = (): TierSnippet => {
	const snippet = autoModeSnippet();
	return autoModeFaults(snippet).length === 0
		? { autoMode: snippet.autoMode }
		: {};
};

/** The `sandbox` block for `platform`, or no key at all when a check of `../sandbox/faults.ts` finds a fault in it. */
const sandboxBlock = (platform: string): TierSnippet => {
	const snippet = sandboxSnippet(platform);
	return sandboxFaults(snippet, platform).length === 0
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
 * 42,879 for a stock run; with the deny list, 31,861, read before `commands/setup.md` put its own 48
 * characters in the listing, where the arm now reads 31,909 (`../cuts.ts`).
 *
 * `platform` is the caller's to name, as `process.platform` spells it, because the two callers read
 * it from different places: `setup.ts` runs under Bun and has `process`, while `onSetupCommand` of
 * `hooks.ts` runs in a hooks module, which has none, and asks the system with `uname -s` instead.
 * `UNKNOWN_PLATFORM` leaves `sandbox.enabled` out.
 */
export const tierSnippet = (row: TierRow, platform: string): TierSnippet => ({
	...builtinSnippet(),
	...compactionSnippet().settings,
	permissions: { ...allowBlock(), ...denyBlock() },
	agent: MAIN_AGENT,
	outputStyle: STYLE,
	...autoModeBlock(),
	...sandboxBlock(platform),
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
