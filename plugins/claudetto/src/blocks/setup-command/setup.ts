import { KEY_GROUPS } from "../../tiers/groups.ts";
import { tierReport } from "../../tiers/report.ts";
import { UNKNOWN_PLATFORM } from "../../tiers/snippet.ts";
import type { Difference, SetupWrite } from "./diff.ts";

export const SETUP_COMMAND = "claudetto:setup";

export const SETUP_TOOL = "setup";

export const SETUP_CALL = "mcp__claudetto__setup";

export const SETUP_MATCH = { tool: [SETUP_CALL] } as const;

/** The longest one `uname -s` run may take. */
export const UNAME_MS = 2000;

const UNAME_PLATFORMS: Readonly<Record<string, string>> = {
	darwin: "darwin",
	linux: "linux",
};

export const platformNamed = (uname: string): string =>
	UNAME_PLATFORMS[uname.trim().toLowerCase()] ?? UNKNOWN_PLATFORM;

export const SETUP_DESCRIPTION =
	"Reads or writes claudetto's keys in the user's Claude Code settings file. " +
	"With no `keep`, it returns each key whose value differs from claudetto's, with its group, the user's value as `now`, and claudetto's value. " +
	"With `keep`, it writes the ids in `keep` and no other key, and returns what it wrote. " +
	"Call it with `keep` only after the user chose the ids with `AskUserQuestion`.";

export const SETUP_INPUT_SCHEMA: Record<string, unknown> = {
	type: "object",
	properties: {
		keep: {
			type: "array",
			items: { type: "string" },
			description:
				"The `id` of each difference that the user chose to write, exactly as the read returned it.",
		},
	},
	additionalProperties: false,
};

/** `undefined` asks for the diff; an array, even an empty one, asks for a write. */
export const keptIds = (input: object): readonly string[] | undefined => {
	const keep = "keep" in input ? input.keep : undefined;
	return Array.isArray(keep)
		? keep.filter((id) => typeof id === "string")
		: undefined;
};

export const diffReply = (
	file: string,
	differences: readonly Difference[],
): string =>
	differences.length === 0
		? `${file} already holds every claudetto key. There is nothing to ask.`
		: JSON.stringify(
				{
					file,
					groups: KEY_GROUPS.map(({ label, why }) => ({ label, why })),
					differences,
				},
				undefined,
				1,
			);

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
