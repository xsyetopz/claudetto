import { fillGuards } from "../guards/wall/fill";
import { WALLS } from "../guards/wall/rules";
import { indentOf, isRecord, type Json, parseSettings } from "./settings";

/**
 * Defaults written only where the user's settings leave a key unset. Each entry
 * carries a measured gain on 2.1.327 (fake-API probe, 2026-11-18, first `-p`
 * request unless noted):
 * - the seven denied tools take 44,803 to 32,049 bytes; ExitPlanMode stays,
 *   because a plan started with shift-tab is presented through it;
 * - `skillListingMaxDescChars` 60 takes 32,049 to 27,043 bytes;
 *   `disableBundledSkills` is left out, as it saves 854 more bytes and removes
 *   the bundled skills;
 * - `bashOutputMaxChars` 8000 trims a 10.5k-character result, 9,384 bytes;
 * - `includeGitInstructions` false with claudetto's shorter git block in its place
 *   -718 against the builtin block and attribution reminder; FORK_SUBAGENT 0 -404,
 *   DISABLE_EXPLORE_PLAN_AGENTS -913, DISABLE_CRON with DISABLE_ADVISOR_TOOL -384
 *   (the advisor stays off by product rule);
 * - SILENT_TURN_REMINDER 0 drops the reminder text, -487 bytes per turn.
 * - `outputStyle` selects the claudetto style when the user picked none: on the
 *   flaky-test prompt its line reran the test and reported the split in 7 of 7
 *   Sonnet runs, vanilla in 0 of 6 (paid probe, 2026-11-19). A style the user
 *   chose stays, so the plugin style is selected here, not forced.
 * The sandbox block and the guard rules come from fillGuards (ADR-0188), the one
 * writer of `sandbox`, so the two never disagree.
 */
/** The commit trailer setup fills: a co-author that git hosts link to Claude's account. */
export const CO_AUTHOR = "Co-Authored-By: Claude <noreply@anthropic.com>";

export const DEFAULTS: Json = {
	skillListingMaxDescChars: 60,
	outputStyle: "claudetto:Claudetto",
	showClearContextOnPlanAccept: true,
	// One commit trailer and never a Signed-off-by, as the Linux kernel's rules for AI agents ask, in the one form
	// GitHub and GitLab credit to an account: GitHub links noreply@anthropic.com to the `claude` login (REQ-GUARDS-063).
	// A PR body credits no one, so the PR line only discloses the tool.
	attribution: { commit: CO_AUTHOR, pr: "Assisted-by: Claude Code" },
	// claudetto's shorter git block replaces the builtin one; the builtin switch also drops the attribution reminder, which claudetto's block carries (hooks/git/instructions.ts).
	includeGitInstructions: false,
	bashOutputMaxChars: 8000,
	worktree: { baseRef: "head" },
	env: {
		// A subagent with no model of its own runs on Sonnet, not the main model; an agent file's `model:` still wins.
		CLAUDE_CODE_SUBAGENT_MODEL: "claude-sonnet-5-5",
		CLAUDE_CODE_DISABLE_ADVISOR_TOOL: "1",
		CLAUDE_CODE_DISABLE_CRON: "1",
		CLAUDE_CODE_FORK_SUBAGENT: "0",
		CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS: "1",
		CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH: "1",
		CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS: "3",
		CLAUDE_CODE_SILENT_TURN_REMINDER: "0",
		CLAUDE_ASYNC_AGENT_STALL_TIMEOUT_MS: "900000",
		MAX_MCP_OUTPUT_TOKENS: "10000"
	},
	permissions: {
		// One perl call makes many edits in place of many Edit calls (ADR-0097); edit/perl.ts shows its diff.
		// `claude -p` is a paid run, so it stays behind the permission prompt.
		allow: ["Bash(perl -0pi -e *)", "Bash(perl -pi -e *)"],
		deny: [
			"Workflow",
			"ScheduleWakeup",
			"ReportFindings",
			"CronCreate",
			"CronDelete",
			"CronList",
			"EnterPlanMode"
		]
	}
};

/**
 * Texts that earlier setup versions wrote to CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT.
 * An env entry equal to one is removed; a text the user wrote is kept.
 */
export const RETIRED_REMINDER_TEXTS: readonly string[] = [
	"The user hasn't heard from you in a while. When you have a finding or a result, report it in one sentence, then continue. Keep your next call unannounced.",
	"A progress update is due: when you have a finding or a result, report it to user in one sentence, then make your next call."
];

/**
 * Allow entries that earlier setup versions wrote. `Bash(claude -p *)` let a paid
 * headless run start with no prompt (RISK-391, RISK-393), so the fill removes it.
 */
export const RETIRED_ALLOWS: readonly string[] = ["Bash(claude -p *)"];

/**
 * Commit trailers that earlier setup versions wrote to `attribution.commit`. No git
 * host credits an `Assisted-by` line to an account, so the fill replaces one equal
 * to an entry with CO_AUTHOR; a trailer the user wrote is kept.
 */
export const RETIRED_COMMIT_TRAILERS: readonly string[] = [
	"Assisted-by: Claude Code"
];

export interface Fill {
	readonly text: string;
	readonly added: readonly string[];
}

/** Merges defaults into held: scalars when unset, records by key, arrays by missing entry. */
const merge = (
	held: Json,
	defaults: Json,
	path: string,
	added: string[]
): Json => {
	const out: Json = { ...held };
	for (const [key, value] of Object.entries(defaults)) {
		const here = path === "" ? key : `${path}.${key}`;
		const current = out[key];
		if (isRecord(value)) {
			if (current === undefined || isRecord(current)) {
				out[key] = merge(isRecord(current) ? current : {}, value, here, added);
			}
		} else if (Array.isArray(value)) {
			if (current === undefined || Array.isArray(current)) {
				const kept: unknown[] = Array.isArray(current) ? current : [];
				const wanted: unknown[] = value;
				const missing = wanted.filter((entry) => !kept.includes(entry));
				if (missing.length > 0) {
					out[key] = [...kept, ...missing];
					added.push(...missing.map((entry) => `${here} ${String(entry)}`));
				}
			}
		} else if (current === undefined) {
			out[key] = value;
			added.push(here);
		}
	}
	return out;
};

/** Drops a reminder text an earlier release wrote, so core's own text applies again. */
const dropRetiredReminder = (next: Json, added: string[]): void => {
	const env = next["env"];
	if (
		isRecord(env) &&
		typeof env["CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT"] === "string" &&
		RETIRED_REMINDER_TEXTS.includes(
			env["CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT"]
		)
	) {
		const { CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT: _retired, ...rest } = env;
		next["env"] = rest;
		added.push("removed env.CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT");
	}
};

/** Drops the allow entries an earlier release wrote and a later one retired. */
const dropRetiredAllows = (next: Json, added: string[]): void => {
	const permissions = next["permissions"];
	if (!isRecord(permissions) || !Array.isArray(permissions["allow"])) {
		return;
	}
	const allow: unknown[] = permissions["allow"];
	const retired = allow.filter(
		(entry) => typeof entry === "string" && RETIRED_ALLOWS.includes(entry)
	);
	if (retired.length > 0) {
		next["permissions"] = {
			...permissions,
			allow: allow.filter((entry) => !retired.includes(entry))
		};
		added.push(
			...retired.map((entry) => `removed permissions.allow ${String(entry)}`)
		);
	}
};

/** Replaces a commit trailer an earlier release wrote with the current one. */
const replaceRetiredTrailer = (next: Json, added: string[]): void => {
	const attribution = next["attribution"];
	if (
		isRecord(attribution) &&
		typeof attribution["commit"] === "string" &&
		RETIRED_COMMIT_TRAILERS.includes(attribution["commit"])
	) {
		next["attribution"] = { ...attribution, commit: CO_AUTHOR };
		added.push(`replaced attribution.commit ${attribution["commit"]}`);
	}
};

/** Adds each default the settings text lacks; undefined when the text is not a JSON object. */
export const fillSettings = (
	text?: string,
	walls: readonly string[] = WALLS
): Fill | undefined => {
	const held =
		text === undefined || text.trim() === "" ? {} : parseSettings(text);
	if (held === undefined) {
		return undefined;
	}
	const added: string[] = [];
	const next = merge(held, DEFAULTS, "", added);
	dropRetiredReminder(next, added);
	dropRetiredAllows(next, added);
	replaceRetiredTrailer(next, added);
	fillGuards(next, added, walls);
	if (added.length === 0) {
		return { text: text ?? "", added };
	}
	return {
		text: `${JSON.stringify(next, null, indentOf(text ?? ""))}\n`,
		added
	};
};

/** Whether a fill entry reports a removal or a replacement, not a set default. */
const isChange = (entry: string): boolean =>
	entry.startsWith("removed ") || entry.startsWith("replaced ");

/**
 * The fill notice, with list entries counted per key, because the terminal
 * draws a `$.ui.log` line up to 2000 characters and a first fill names over 3000.
 *
 * @param path User settings file the fill wrote.
 * @param added Entries `fillSettings` reported, each a key or a key and a list entry.
 * @returns One line naming each set key, the count of entries added per list, and each removal or replacement on its own.
 */
export const fillNotice = (path: string, added: readonly string[]): string => {
	const removals = added.filter((entry) => isChange(entry));
	const sets = added.filter((entry) => !isChange(entry));
	const groups = new Map<string, string[]>();
	for (const entry of sets) {
		const key = entry.split(" ", 1)[0] ?? entry;
		groups.set(key, [...(groups.get(key) ?? []), entry]);
	}
	const named = [...groups.values()].map((entries) =>
		entries.length === 1
			? entries[0]
			: `${entries[0]?.split(" ", 1)[0]} (${entries.length} entries)`
	);
	const parts: string[] = [];
	if (sets.length > 0) {
		parts.push(`set ${sets.length} unset default(s): ${named.join(", ")}`);
	}
	if (removals.length > 0) {
		parts.push(removals.join(", "));
	}
	return `claudetto changed ${path}: ${parts.join("; ")}.`;
};

/** FNV-1a hash of a text, as eight hex digits; the hooks worker has no crypto global to rely on. */
export const fillVersion = (text: string): string => {
	let hash = 2_166_136_261;
	for (let i = 0; i < text.length; i++) {
		hash = Math.imul(hash ^ (text.codePointAt(i) ?? 0), 16_777_619) >>> 0;
	}
	return hash.toString(16).padStart(8, "0");
};

/**
 * Identifies the current defaults set, so a fill runs once per set and never
 * undoes a user's later edit. Derived from the filled text of empty settings, so
 * any change to a default or a guard rule starts a new fill; a hand-bumped
 * number was missed when the git -C rules landed (#41).
 */
export const FILL_VERSION = fillVersion(
	fillSettings(undefined, [])?.text ?? ""
);
