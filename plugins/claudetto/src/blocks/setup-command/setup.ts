import { groupLabels, KEY_GROUPS } from "../../tiers/groups.ts";
import { tierReport } from "../../tiers/report.ts";
import { UNKNOWN_PLATFORM } from "../../tiers/snippet.ts";

export const SETUP_COMMAND = "claudetto:setup";

/** The longest one `uname -s` run may take. */
export const UNAME_MS = 2000;

const UNAME_PLATFORMS: Readonly<Record<string, string>> = {
	darwin: "darwin",
	linux: "linux",
};

export const QUESTION = "Which settings should claudetto write?";

export const platformNamed = (uname: string): string =>
	UNAME_PLATFORMS[uname.trim().toLowerCase()] ?? UNKNOWN_PLATFORM;

export const chosenGroups = (answer: string): readonly string[] => {
	const labels = groupLabels();
	return answer
		.split(",")
		.map((part) => part.trim())
		.filter((part) => labels.includes(part));
};

const discardedLines = (kept: readonly string[]): readonly string[] =>
	KEY_GROUPS.filter((group) => !kept.includes(group.label)).map(
		(group) =>
			`Discarded ${group.label}: no key of it was written, and a key you already have stays. What it would have done: ${group.why}`,
	);

export const setupReport = (
	file: string,
	kept: readonly string[],
	applied: Parameters<typeof tierReport>[1],
): string =>
	[
		tierReport(undefined, applied),
		...discardedLines(kept),
		`Wrote ${file}. Restart Claude Code: the keys are read when it starts.`,
	].join("\n");
