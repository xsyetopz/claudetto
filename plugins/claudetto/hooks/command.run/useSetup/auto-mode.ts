// The classifier frame keeps its Definitions and consent bars when the lists are replaced,
// so each rule leans on those terms and names a class of effect, not a list of commands.

interface Rule {
	readonly name: string;
	/** The consent-bar slot of a soft rule, which the frame reads to decide what the user must name. */
	readonly mustName?: string;
	readonly text: string;
}

const ruleEntry = (rule: Rule): string =>
	rule.mustName === undefined
		? `${rule.name}: ${rule.text}`
		: `${rule.name} [named+specifics — **must name:** ${rule.mustName}]: ${rule.text}`;

const HARD_RULES: readonly Rule[] = [
	{
		name: "Wipe a Disk",
		text: "Erasing, formatting, or repartitioning a disk or volume, or deleting the home folder or a system folder.",
	},
];

// The client names a block's rule only when the server cites a `soft_deny` entry, so every soft block cites this one.
const SOFT_RULES: readonly Rule[] = [
	{
		name: "Destroy Work",
		mustName: "the deletion and its target",
		text: "Deleting or overwriting what nothing can restore: force-push, history rewrite, remote branches, tags, releases, uncommitted work, files outside the working tree that no copy holds, shared or cloud storage, or an unresolved target (variable, glob, `~`) outside a temp folder.",
	},
];

const ALLOW_RULES: readonly Rule[] = [
	{
		name: "Everything Else",
		text: "Every action no block rule names, in this repo or any other: reading, writing, building, network calls, installs, commits and pushes, settings and agent files, messages, and deleting temp folders, scratch copies, worktrees, and build output.",
	},
];

/** Replacing `environment` drops each built-in entry left out here, so this list keeps the two the rules lean on. */
const TRUST_ENTRIES: readonly string[] = [
	"**Trusted repo**: The git repository the agent started in (its working directory) and its configured remote(s).",
	"**Source control**: The trusted repo and its remote(s) only.",
];

/** Replaces every built-in list; no `$defaults`, so the classifier reads only these. */
export const AUTO_MODE = {
	allow: ALLOW_RULES.map((item) => ruleEntry(item)),
	soft_deny: SOFT_RULES.map((item) => ruleEntry(item)),
	hard_deny: HARD_RULES.map((item) => ruleEntry(item)),
	environment: TRUST_ENTRIES,
};
