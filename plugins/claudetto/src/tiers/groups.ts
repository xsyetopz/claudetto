// What the setup command offers to keep. `$.ui.ask` takes two to four option labels, so the keys the
// command may write are bundled into groups that each stand for one decision. A group is kept whole
// or discarded whole.
//
// `tests/claudetto/tier/hooks.test.ts` checks that every key of the snippet sits in exactly one group
// or in `UNSHIPPED_KEYS`, so a key added to `snippet.ts` cannot end up offered to nobody and
// discarded without anyone deciding that.

import type { TierSnippet } from "./snippet.ts";

/**
 * Keys of the snippet that `/claudetto:setup` never writes, however the dialog is answered.
 *
 * `autoMode` is here because `autoMode.environment` is the readings of *this* repository
 * (`../automode/environment.ts:1`, "the `autoMode.environment` facts of this project"): the
 * `xsyetopz` remote, `plugins/claudetto/` as the product, and one macOS workstation. The auto-mode
 * classifier reads those as the environment of whoever holds the settings file, and it decides from
 * them whether a command runs without asking, so writing them into a stranger's settings would feed
 * a permission decision facts that are false for that machine. `just setup` still writes them,
 * because it runs inside this checkout, where each reading is true.
 *
 * Nothing of value is lost: the `allow`, `soft_deny`, and `hard_deny` lists of the snippet are
 * `$defaults` alone, as `just capture --arm plugin --shipped` prints, so for anyone but this
 * repository the whole key is the environment facts.
 */
export const UNSHIPPED_KEYS: readonly string[] = ["autoMode"];

/** One bundle of snippet keys, kept or discarded as a whole. `label` is what the dialog shows and what the answer names, so the two must stay the same text. */
export interface KeyGroup {
	readonly label: string;
	/** What keeping the group does, as one line of the command's output. */
	readonly why: string;
	/** The top-level keys of the snippet this group carries. */
	readonly keys: readonly string[];
}

/**
 * The three groups, in the order the dialog lists them.
 *
 * The first is one group and not five because `permissions.deny` ships with the two switches of
 * `builtinSnippet` and never apart from them (`snippet.ts`): `disableBundledSkills` alone moves the
 * workflow text into the `Workflow` definition while that tool is still offered, which is a loss.
 * The measured figures are of the whole group together, read with `just capture --arm plugin --shipped`.
 */
export const KEY_GROUPS: readonly KeyGroup[] = [
	{
		label: "Smaller prompt",
		why: "Turns off the bundled skills and most built-in plugins, denies three tools, allows `git status` and the bare `git diff`, `git log`, and `git show`, and selects the `claudetto:main` agent body and the `claudetto:Concise` output style. Together they take the first request from 42,879 characters to 31,959, and the tool schemas from 12 tools to 9.",
		keys: [
			"disableBundledSkills",
			"enabledPlugins",
			"permissions",
			"agent",
			"outputStyle",
		],
	},
	{
		label: "Sandbox",
		why: "Runs a `Bash` command inside the sandbox with `allowUnsandboxedCommands` set to `false`, and keeps it out of `~/.ssh`, `~/.gnupg`, `~/.aws/credentials`, `~/.netrc`, and `~/.docker/config.json`. It costs 7,254 characters of the first request and repays them, because a sandboxed command is auto-allowed before the auto-mode classifier runs and one classifier call is 140,718 characters.",
		keys: ["sandbox"],
	},
	{
		label: "Models and windows",
		why: "Writes `claude-opus-5-5` as the main model at `medium` effort, `claude-sonnet-5-5` for subagents, and the context windows and compaction thresholds the handoff is written against.",
		keys: [
			"model",
			"effortLevel",
			"env",
			"autoCompactWindow",
			"modelSettings",
			"idleCompaction",
		],
	},
];

/** The labels the dialog offers, which is what an answer of `$.ui.ask` names. */
export const groupLabels = (): readonly string[] =>
	KEY_GROUPS.map((group) => group.label);

/** Every key of every group, in the order of the groups. */
export const groupedKeys = (): readonly string[] =>
	KEY_GROUPS.flatMap((group) => group.keys);

/**
 * `snippet` cut to the keys of the groups whose label is in `kept`.
 *
 * A key of the snippet that no group carries is left out, which is how a key of `UNSHIPPED_KEYS`
 * stays out however the dialog is answered, and also how a key added to `snippet.ts` without a group
 * is discarded rather than written unasked. The test above makes the second case a failure.
 */
export const keptSnippet = (
	snippet: TierSnippet,
	kept: readonly string[],
): TierSnippet => {
	const keys = new Set(
		KEY_GROUPS.filter((group) => kept.includes(group.label)).flatMap(
			(group) => group.keys,
		),
	);
	return Object.fromEntries(
		Object.entries(snippet).filter(([key]) => keys.has(key)),
	);
};
