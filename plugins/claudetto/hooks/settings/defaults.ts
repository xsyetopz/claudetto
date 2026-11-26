import { dropConflicts } from "../guards/wall/conflicts";
import { guardSettings } from "../guards/wall/fill";
import { FREE, GUARDED, WALLS } from "../guards/wall/rules";
import { leaves, type OwnedKey, removeStale } from "./owned";
import { indentOf, isRecord, type Json, parseSettings } from "./settings";

/** The commit trailer setup writes: a co-author that git hosts link to Claude's account. */
export const CO_AUTHOR = "Co-Authored-By: Claude <noreply@anthropic.com>";

/**
 * The settings claudetto builds besides the guards. Each entry carries a measured gain on 2.1.327 (fake-API probe, 2026-11-18, first `-p`
 * request unless noted):
 * - the seven denied tools take 44,803 to 32,049 bytes; ExitPlanMode stays,
 *   because a plan started with shift-tab is presented through it;
 * - `skillListingMaxDescChars` 200 (60 took 32,049 to 27,043 bytes, but cut each skill's trigger,
 *   so the spec skill loaded in 0 of 6 runs; 2026-11-26, RISK-561);
 *   `disableBundledSkills` is left out, as it saves 854 more bytes and removes
 *   the bundled skills;
 * - `bashOutputMaxChars` 8000 trims a 10.5k-character result, 9,384 bytes;
 * - `includeGitInstructions` false with claudetto's shorter git block in its place
 *   -718 against the builtin block and attribution reminder; FORK_SUBAGENT 0 -404,
 *   DISABLE_EXPLORE_PLAN_AGENTS -913, DISABLE_CRON with DISABLE_ADVISOR_TOOL -384
 *   (the advisor stays off by product rule);
 * - SILENT_TURN_REMINDER 0 drops the reminder text, -487 bytes per turn.
 * - `outputStyle` selects the claudetto style: on the flaky-test prompt its line
 *   reran the test and reported the split in 7 of 7 Sonnet runs, vanilla in 0 of 6
 *   (paid probe, 2026-11-19). The fill sets it over a style the user chose,
 *   because the style belongs to what this release measured.
 * The sandbox block and the guard rules come from guardSettings, the one source
 * of `sandbox`, so the two never disagree.
 */
export const DEFAULTS: Json = {
	skillListingMaxDescChars: 200,
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

/** The outcome of a fill. */
export interface Fill {
	/** The settings text to write; the input text when nothing changed. */
	readonly text: string;
	/** What changed: keys set, `replaced` values, `removed` entries and keys. */
	readonly added: readonly string[];
	/** The scalar keys this release's construction names, to store for the next fill. */
	readonly owned: readonly OwnedKey[];
}

/** Joins two settings objects; records recurse, lists union, a scalar of `extra` wins. */
const combine = (base: Json, extra: Json): Json => {
	const out: Json = { ...base };
	for (const [key, value] of Object.entries(extra)) {
		const current = out[key];
		if (isRecord(value) && isRecord(current)) {
			out[key] = combine(current, value);
		} else if (Array.isArray(value) && Array.isArray(current)) {
			const have: unknown[] = current;
			const more: unknown[] = value;
			out[key] = [...have, ...more.filter((entry) => !have.includes(entry))];
		} else {
			out[key] = value;
		}
	}
	return out;
};

/**
 * Builds claudetto's settings from this release's sources only: the defaults, the
 * guard rules and the walls. Nothing in it reads a user's file, so the same
 * release always builds the same object.
 *
 * @param walls Protected paths for the guard rules and the sandbox.
 * @returns The settings object the fill applies.
 */
export const construct = (walls: readonly string[] = WALLS): Json =>
	combine(DEFAULTS, guardSettings(walls));

const show = (value: unknown): string =>
	typeof value === "string" ? value : JSON.stringify(value);

/**
 * Applies the construction to `held` in place. A scalar takes the construction's
 * value, a record recurses and a list gains the entries it lacks. A held value of
 * another shape than the construction's is replaced, because the construction
 * names the key.
 */
const apply = (
	held: Json,
	wanted: Json,
	path: readonly string[],
	added: string[]
): void => {
	for (const [key, value] of Object.entries(wanted)) {
		const here = [...path, key].join(".");
		const current = held[key];
		const shaped =
			(isRecord(value) && isRecord(current)) ||
			(Array.isArray(value) && Array.isArray(current));
		if (current !== undefined && !shaped && current !== value) {
			added.push(`replaced ${here} ${show(current)}`);
		}
		if (isRecord(value)) {
			const target = isRecord(current) ? current : {};
			held[key] = target;
			apply(target, value, [...path, key], added);
		} else if (Array.isArray(value)) {
			const have: unknown[] = Array.isArray(current) ? current : [];
			const missing: unknown[] = value.filter((entry) => !have.includes(entry));
			held[key] = [...have, ...missing];
			added.push(...missing.map((entry) => `${here} ${show(entry)}`));
		} else if (current === undefined) {
			held[key] = value;
			added.push(here);
		} else if (current !== value) {
			held[key] = value;
		}
	}
};

/**
 * Builds the construction and applies it to the settings text: its scalars win
 * over the user's, its records recurse, its list entries are added, each
 * `Bash(...)` rule that conflicts with a free or guarded command is removed, and
 * a key the previous fill wrote and this one no longer names is deleted while it
 * still holds the value claudetto wrote.
 *
 * @param text The user settings text, or undefined when the file does not exist.
 * @param walls Protected paths for the guard rules and the sandbox.
 * @param previous The keys the previous fill recorded as written.
 * @returns The fill, or undefined when the text is not a JSON object.
 */
export const fillSettings = (
	text?: string,
	walls: readonly string[] = WALLS,
	previous: readonly OwnedKey[] = []
): Fill | undefined => {
	const held =
		text === undefined || text.trim() === "" ? {} : parseSettings(text);
	if (held === undefined) {
		return undefined;
	}
	const wanted = construct(walls);
	const owned = leaves(wanted);
	const added: string[] = [];
	const next = removeStale(held, previous, owned, added);
	apply(next, wanted, [], added);
	dropConflicts(next, added);
	if (added.length === 0) {
		return { text: text ?? "", added, owned };
	}
	return {
		text: `${JSON.stringify(next, null, indentOf(text ?? ""))}\n`,
		added,
		owned
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
 * @param added Entries `fillSettings` reported: a set key, a key and a list entry, or a `replaced` or `removed` line.
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
		parts.push(`set ${sets.length} value(s): ${named.join(", ")}`);
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
 * Identifies the current construction, so a fill runs once per release and never
 * undoes a user's later edit. Derived from the filled text of empty settings and
 * the probe commands, so a change to a default, a guard rule or a probe starts a
 * new fill; a hand-bumped number was missed when the git -C rules landed (#41).
 */
export const FILL_VERSION = fillVersion(
	JSON.stringify([
		fillSettings(undefined, [])?.text ?? "",
		FREE.map((probe) => probe.command),
		GUARDED.map((probe) => probe.command)
	])
);
