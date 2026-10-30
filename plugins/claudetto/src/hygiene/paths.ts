/** `temp` is Claude Code's temp root `claude-<uid>` (`/private/tmp/claude-<uid>` on macOS), and `project` is the project folder. */
export type HygieneRoot = "temp" | "project";

/** Minutes, or the user's `cleanupPeriodDays` (30 when unset), which is how long Claude Code keeps its own session files. */
export type MaxAge = { readonly minutes: number } | "cleanupPeriodDays";

/** One kind of file that Claude Code or claudetto leaves behind and never removes. */
export interface StalePath {
	readonly id: string;
	readonly root: HygieneRoot;
	/** The path under the root; `*` stands for one name. */
	readonly pattern: string;
	readonly maxAge: MaxAge;
	/** What stays even past the age, because removing it would cost work or a live session. */
	readonly keep: string;
	readonly source: string;
}

/** Every path hygiene may remove. A path outside these rows is never touched. */
export const STALE_PATHS: readonly StalePath[] = [
	{
		id: "probe",
		root: "temp",
		pattern: "fswatch-probe-*",
		maxAge: { minutes: 60 },
		keep: "A probe younger than an hour, since a session may still be watching it.",
		source:
			"A reading of `/private/tmp/claude-501` on macOS under Claude Code `2.1.314`, 2026-10-30: 130 probe folders made between 09:07 and 20:11 of one day, 120 of them older than an hour. No docs page names a sweep of them.",
	},
	{
		id: "session-temp",
		root: "temp",
		pattern: "*/<session-id>",
		maxAge: "cleanupPeriodDays",
		keep: "The current session, and any session that a file in `~/.claude/sessions/` names.",
		source:
			"clawdipedia `how-it-works/sessions-and-storage` for `2.1.314`: the scratchpad is under `/private/tmp/claude-<uid>/<project>/<session-id>/`, and `claude purge` does not touch it. A reading of the same folder, 2026-10-30: 6,777 session folders over 3 days.",
	},
	{
		id: "handoff",
		root: "project",
		pattern: ".claude/claudetto/handoffs/handoff-*.md",
		maxAge: "cleanupPeriodDays",
		keep: "The newest handoff of the project, which a resume reads back.",
		source:
			"claudetto writes handoffs into `HANDOFF_DIR` under a UTC stamp, and its read-back takes only the newest name. A reading of this repository, 2026-10-30: 3 handoffs.",
	},
];
