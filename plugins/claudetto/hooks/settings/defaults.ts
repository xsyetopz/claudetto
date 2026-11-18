import { type Json, indentOf, isRecord, parseSettings } from "./settings";

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
 * - DISABLE_GIT_INSTRUCTIONS -1,492, FORK_SUBAGENT 0 -404, DISABLE_EXPLORE_PLAN_AGENTS
 *   -913, DISABLE_CRON with DISABLE_ADVISOR_TOOL -384 (the advisor stays off by
 *   product rule);
 * - SILENT_TURN_REMINDER 0 drops the reminder text, -487 bytes per turn.
 * The sandbox block follows ADR-0188: sandboxed commands run with no prompt.
 */
export const DEFAULTS: Json = {
	skillListingMaxDescChars: 60,
	showClearContextOnPlanAccept: true,
	bashOutputMaxChars: 8000,
	worktree: { baseRef: "head" },
	env: {
		CLAUDE_CODE_DISABLE_ADVISOR_TOOL: "1",
		CLAUDE_CODE_DISABLE_CRON: "1",
		CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS: "1",
		CLAUDE_CODE_FORK_SUBAGENT: "0",
		CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS: "1",
		CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH: "1",
		CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS: "3",
		CLAUDE_CODE_SILENT_TURN_REMINDER: "0",
		CLAUDE_ASYNC_AGENT_STALL_TIMEOUT_MS: "900000",
		MAX_MCP_OUTPUT_TOKENS: "10000",
	},
	permissions: {
		allow: ["Bash(claude -p *)"],
		deny: [
			"Workflow",
			"ScheduleWakeup",
			"ReportFindings",
			"CronCreate",
			"CronDelete",
			"CronList",
			"EnterPlanMode",
		],
	},
	sandbox: {
		enabled: true,
		autoAllowBashIfSandboxed: true,
		allowUnsandboxedCommands: true,
		excludedCommands: ["claude *"],
		network: { allowAllUnixSockets: true },
		filesystem: {
			allowWrite: ["/opt/homebrew", "/private/var/folders"],
			denyWrite: ["/private/var/folders/**/xcrun_db*"],
		},
	},
};

/**
 * Texts that earlier setup versions wrote to CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT.
 * An env entry equal to one is removed; a text the user wrote is kept.
 */
export const RETIRED_REMINDER_TEXTS: readonly string[] = [
	"The user hasn't heard from you in a while. When you have a finding or a result, report it in one sentence, then continue. Keep your next call unannounced.",
	"A progress update is due: when you have a finding or a result, report it to user in one sentence, then make your next call.",
];

/** Bumped when the defaults change, so a fill runs once per set and never undoes a user's later edit. */
export const FILL_VERSION = 2;

export type Fill = { readonly text: string; readonly added: readonly string[] };

/** Merges defaults into held: scalars when unset, records by key, arrays by missing entry. */
const merge = (held: Json, defaults: Json, path: string, added: string[]): Json => {
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
				const kept = Array.isArray(current) ? (current as unknown[]) : [];
				const missing = value.filter((entry) => !kept.includes(entry));
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

/** Adds each default the settings text lacks; undefined when the text is not a JSON object. */
export const fillSettings = (text: string | undefined): Fill | undefined => {
	const held = text === undefined || text.trim() === "" ? {} : parseSettings(text);
	if (held === undefined) return undefined;
	const added: string[] = [];
	const next = merge(held, DEFAULTS, "", added);
	const env = next["env"];
	if (
		isRecord(env) &&
		typeof env["CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT"] === "string" &&
		RETIRED_REMINDER_TEXTS.includes(env["CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT"])
	) {
		const { CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT: _retired, ...rest } = env;
		next["env"] = rest;
		added.push("removed env.CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT");
	}
	if (added.length === 0) return { text: text ?? "", added };
	return { text: `${JSON.stringify(next, null, indentOf(text ?? ""))}\n`, added };
};
