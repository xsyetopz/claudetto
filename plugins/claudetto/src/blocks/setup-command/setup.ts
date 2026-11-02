import { tierReport } from "../../tiers/report.ts";
import { UNKNOWN_PLATFORM } from "../../tiers/snippet.ts";
import type { SetupWrite } from "./diff.ts";

export const SETUP_COMMAND = "claudetto:setup";

/** The longest one `uname -s` run may take. */
export const UNAME_MS = 2000;

const UNAME_PLATFORMS: Readonly<Record<string, string>> = {
	darwin: "darwin",
	linux: "linux",
};

export const platformNamed = (uname: string): string =>
	UNAME_PLATFORMS[uname.trim().toLowerCase()] ?? UNKNOWN_PLATFORM;

export const setupReport = (file: string, write: SetupWrite): string =>
	[
		tierReport(undefined, write.applied),
		...write.refused.map(
			(id) =>
				`Refused ${id}: it names no difference, or another id names the same key. It was not written.`,
		),
		write.applied.written.length === 0
			? `${file} was not changed.`
			: `Wrote ${file}. Restart Claude Code: the keys are read when it starts.`,
	].join("\n");

export const nothingToAsk = (file: string): string =>
	`${file} already holds every claudetto key. There is nothing to ask.`;
