// The plan line and the repository facts of `prompt.context` (spec `prompt-base`, finding X5). The plan line holds the plan name only: no email, name, or UUID.

import { openChange } from "../../../project/domain/change.ts";
import { FACT_VALUE_MAX_CHARS } from "../limits.ts";
import { GREP_SYSTEM, GREP_UGREP, PLAN_LINE } from "../prompts.ts";

export const PLAN_BLOCK = "plan";
export const REPO_BLOCK = "repo";

/** The plan name of each tier that the `plan` option can hold (the tiers of `PLAN_CAPS` in the `setup` slice). */
const PLAN_NAMES: Readonly<Record<string, string>> = {
	claude_pro: "Pro",
	default_claude_max_5x: "Max 5x",
	default_claude_max_20x: "Max 20x",
};

/** The plan line for the `plan` option `tier`, or `""` for an empty, an unknown, or an API key tier. */
export const planLine = (tier: unknown): string =>
	typeof tier === "string" && Object.hasOwn(PLAN_NAMES, tier)
		? PLAN_LINE(PLAN_NAMES[tier] ?? "")
		: "";

export const MODELS_BLOCK = "models";

/** `value` as a record, or `{}` when it is no object. */
const recordOf = (value: unknown): Record<string, unknown> =>
	typeof value === "object" && value !== null ? { ...value } : {};

/** Whether the newest slot of `clientDataCacheSlots` in the `.claude.json` text `state` has `cedar_lagoon["claude-mythos"]: true`. Claude Code stores the bootstrap `client_data` in `data` with the write time in `at`, and `cedar_lagoon` is server data that no doc and no code of Claude Code names, so any other shape counts as no access. */
export const hasMythos = (state: string): boolean => {
	let parsed: unknown;
	try {
		parsed = JSON.parse(state);
	} catch {
		return false;
	}
	const [newest] = Object.values(
		recordOf(recordOf(parsed)["clientDataCacheSlots"]),
	)
		.map(recordOf)
		.flatMap((slot) =>
			typeof slot["at"] === "number"
				? [{ at: slot["at"], data: slot["data"] }]
				: [],
		)
		.sort((a, b) => b.at - a.at);
	return (
		recordOf(recordOf(newest?.data)["cedar_lagoon"])["claude-mythos"] === true
	);
};

/** The first line of `value`, cut to `FACT_VALUE_MAX_CHARS`. */
const clip = (value: string): string =>
	(value.split("\n")[0] ?? "").trim().slice(0, FACT_VALUE_MAX_CHARS);

/** The facts that the adapter gathers: each value is `""` when its run failed. `shell` is the `SHELL` path, and `ugrep` is `usesUgrep`. */
export interface RepoFacts {
	readonly branch: string;
	readonly tag: string;
	readonly changes: readonly { name: string; tasks: string | null }[];
	readonly shell: string;
	readonly ugrep: boolean;
}

/** What the hook sees of the build: the `CLAUDE_CODE_EXECPATH` path, the tools on, and the `CLAUDE_CODE_ENTRYPOINT` value. */
export interface SearchFacts {
	readonly execPath: string;
	readonly toolNames: readonly string[];
	readonly entrypoint: string;
}

const NODE_RUNTIME = /^(node|nodejs|bun)(\.exe)?$/i;
const PATH_SEPARATOR = /[\\/]/;

/** Whether the shell snapshot of `Bash` shadows `grep` with `ugrep` (2.1.311, `JT()`): a native build, `Grep` and `Glob` off, and an entry point other than `local-agent`. */
export const usesUgrep = (facts: SearchFacts): boolean =>
	facts.execPath !== "" &&
	!NODE_RUNTIME.test(facts.execPath.split(PATH_SEPARATOR).pop() ?? "") &&
	!facts.toolNames.some((name) => name === "Grep" || name === "Glob") &&
	facts.entrypoint !== "local-agent";

/** The `repo` block: one line for each fact that is known, or `""` when none is. */
export const repoFacts = (facts: RepoFacts): string => {
	const [branch, tag] = [facts.branch, facts.tag].map(clip);
	const change = openChange(facts.changes);
	const shell = clip(facts.shell.split("/").pop() ?? "");
	return [
		branch && `Branch: ${branch}`,
		tag && `Latest tag: ${tag}`,
		change &&
			`Open change: ${clip(change.name)}, next task ${clip(change.next)}`,
		shell && `Shell: ${shell}`,
		facts.ugrep ? GREP_UGREP : GREP_SYSTEM,
	]
		.filter(Boolean)
		.join("\n");
};
