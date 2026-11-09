export const HANDOFF_DIR = ".claude/claudetto/handoffs";

export const HANDOFF_TITLE = "# Handoff";

export const BUILT_BY_CODE = "Built by claudetto";

export const HANDOFF_NAME = /^handoff-\d{4}-\d\d-\d\dT\d\d-\d\d-\d\d\.md$/;

export const HANDOFF_SECTIONS = [
	"Goal",
	"Standing instructions",
	"Decisions log",
	"Current state",
	"In progress",
	"Next steps",
	"Key files and symbols",
	"Gotchas and dead ends",
	"Open questions",
];

const FRACTION = /\..*$/;

/** The stamp sorts by time, so the read-back takes the last name of the folder. */
export const handoffPath = (at: Date): string =>
	`${HANDOFF_DIR}/handoff-${at.toISOString().replaceAll(":", "-").replace(FRACTION, "")}.md`;

/** The engine resolves a relative path against the shell's directory, which a `cd` moves, and the project root stays. */
export const atRoot = (root: string, path: string): string => `${root}/${path}`;

/** The first line of `git status -sb`, dated, because the remote can move after the handoff is written. */
export const gitLines = (status: string, at: string): string[] => {
	const head = status.split("\n")[0] ?? "";
	return head === "" ? [] : [`Git as of ${at}: \`${head}\``, ""];
};

export const layout = (
	source: string,
	body: (section: string) => readonly string[],
): string =>
	[
		HANDOFF_TITLE,
		"",
		source,
		"",
		...HANDOFF_SECTIONS.flatMap((section) => [
			`## ${section}`,
			"",
			...body(section),
		]),
	]
		.join("\n")
		.trimEnd()
		.concat("\n");
