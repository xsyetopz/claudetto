/** `temp` is Claude Code's temp root `claude-<uid>` (`/private/tmp/claude-<uid>` on macOS), and `project` is the project folder. */
export type HygieneRoot = "temp" | "project";

/** Minutes, or the user's `cleanupPeriodDays`, which the settings schema of Claude Code `2.1.317` describes as the days to retain chat transcripts (default: 30). */
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
		keep: "A probe younger than an hour, a chosen margin.",
		source:
			"Claude Code `2.1.317` names the folders in its `[fs.watch probe]` code (`fswatch-probe-`). `ls -d /private/tmp/claude-501/fswatch-probe-*` listed 89 on macOS, 2026-11-03.",
	},
	{
		id: "session-temp",
		root: "temp",
		pattern: "*/<session-id>",
		maxAge: "cleanupPeriodDays",
		keep: "The current session, and any session that a file in `~/.claude/sessions/` names.",
		source:
			"`ls /private/tmp/claude-501/<project>` on macOS, 2026-11-03, listed session-id folders. `claude purge --help` of `2.1.317` names transcripts, tasks, file history, and the `~/.claude.json` entry, and no scratchpad.",
	},
	{
		id: "handoff",
		root: "project",
		pattern: ".claude/claudetto/handoffs/handoff-*.md",
		maxAge: "cleanupPeriodDays",
		keep: "The newest handoff of the project, which a resume reads back.",
		source:
			"claudetto writes handoffs into `HANDOFF_DIR` under a UTC stamp, and its read-back takes only the newest name.",
	},
	{
		id: "bound-output",
		root: "project",
		pattern: ".claude/claudetto/output/output-*.txt",
		maxAge: { minutes: 1440 },
		keep: "A file younger than a day, a chosen margin: the model may read it back for the part of a log that was cut.",
		source:
			"claudetto writes the whole output of a test or build run into `BOUND_OUTPUT_DIR` when it cuts the text the model reads.",
	},
	{
		id: "heartbeat",
		root: "project",
		pattern: ".claude/claudetto/heartbeat/*.txt",
		maxAge: { minutes: 1440 },
		keep: "A file younger than a day, a chosen margin: the status line of a live session compares it with the transcript.",
		source:
			"The hooks write the time of each model request into `HEARTBEAT_DIR`, so the status line can tell when the CLI turned them off.",
	},
];
