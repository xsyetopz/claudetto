import { type Json, indentOf, isRecord, parseSettings } from "./settings";

/**
 * Tools denied by name, which drops each definition from every request: on
 * 2.1.327 the seven take a `-p` first request from 44,803 to 32,049 bytes
 * (fake-API probe, 2026-11-18). ExitPlanMode stays, because a plan the user
 * starts with shift-tab is presented through it.
 */
export const DENY: readonly string[] = [
	"Workflow",
	"ScheduleWakeup",
	"ReportFindings",
	"CronCreate",
	"CronDelete",
	"CronList",
	"EnterPlanMode",
];

/**
 * Keys written only when unset. `skillListingMaxDescChars` 60 takes the same
 * request from 32,049 to 27,043 bytes; `disableBundledSkills` is left out, as it
 * saves 854 more bytes and removes the bundled skills.
 */
export const KEYS: Readonly<Json> = {
	skillListingMaxDescChars: 60,
	showClearContextOnPlanAccept: true,
};

/** Env values written only when unset; the advisor stays off by product rule. */
export const ENV: Readonly<Record<string, string>> = {
	CLAUDE_CODE_DISABLE_ADVISOR_TOOL: "1",
	CLAUDE_CODE_DISABLE_CRON: "1",
	CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH: "1",
	CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS: "3",
};

/** Bumped when the defaults change, so a fill runs once per set and never undoes a user's later edit. */
export const FILL_VERSION = 1;

export type Fill = { readonly text: string; readonly added: readonly string[] };

/** Adds each default the settings text lacks; undefined when the text is not a JSON object. */
export const fillSettings = (text: string | undefined): Fill | undefined => {
	const held = text === undefined || text.trim() === "" ? {} : parseSettings(text);
	if (held === undefined) return undefined;
	const added: string[] = [];
	const next: Json = { ...held };
	for (const [key, value] of Object.entries(KEYS)) {
		if (next[key] === undefined) {
			next[key] = value;
			added.push(key);
		}
	}
	const worktree = isRecord(next["worktree"]) ? next["worktree"] : {};
	if (worktree["baseRef"] === undefined) {
		next["worktree"] = { ...worktree, baseRef: "head" };
		added.push("worktree.baseRef");
	}
	const env = isRecord(next["env"]) ? next["env"] : {};
	const envAdds = Object.entries(ENV).filter(([name]) => env[name] === undefined);
	if (envAdds.length > 0) {
		next["env"] = { ...env, ...Object.fromEntries(envAdds) };
		added.push(...envAdds.map(([name]) => `env.${name}`));
	}
	const permissions = isRecord(next["permissions"]) ? next["permissions"] : {};
	const deny = Array.isArray(permissions["deny"]) ? (permissions["deny"] as unknown[]) : [];
	const denyAdds = DENY.filter((tool) => !deny.includes(tool));
	if (denyAdds.length > 0) {
		next["permissions"] = { ...permissions, deny: [...deny, ...denyAdds] };
		added.push(...denyAdds.map((tool) => `deny ${tool}`));
	}
	if (added.length === 0) return { text: text ?? "", added };
	return { text: `${JSON.stringify(next, null, indentOf(text ?? ""))}\n`, added };
};

