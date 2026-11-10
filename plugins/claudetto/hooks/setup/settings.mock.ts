import { applyChanges, capGroup, changesOf } from "./changes.ts";
import { type Group, GROUPS, type Json, valueAt } from "./settings.ts";

/** The settings after every group is applied with `replace`. */
export const everything = (held: Json): Json => {
	let settings = held;
	for (const group of GROUPS) {
		settings = applyChanges(settings, changesOf(settings, group), "replace");
	}
	return settings;
};

export const groupNamed = (label: string): Group => {
	const found = GROUPS.find((g) => g.label === label);
	if (found === undefined) {
		throw new Error(`no ${label} group`);
	}
	return found;
};

/** The array `value` is, or none. */
export const listOf = (value: unknown): unknown[] =>
	Array.isArray(value) ? value : [];

export const login = (tiers: Json): Json => ({ oauthAccount: tiers });

/** The subagent cap a login record gives, if any. */
export const capOf = (account: Json): unknown =>
	valueAt(capGroup(account)?.settings, [
		"env",
		"CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS",
	]);
