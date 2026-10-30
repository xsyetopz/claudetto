import type { Applied, Skipped } from "./merge.ts";

const SKIP_REASON = {
	set: "you set it",
	rejected: "you rejected it",
};

const shown = (value: unknown): string => JSON.stringify(value);

const skippedLine = (skip: Skipped): string => {
	const kept =
		skip.kept === undefined ? "" : `, your value ${shown(skip.kept)} stays`;
	return `Skipped ${skip.path}: ${SKIP_REASON[skip.why]}${kept}. The row has ${shown(skip.wanted)}.`;
};

export const tierReport = (
	tier: string | undefined,
	applied: Applied,
): string =>
	[
		...(tier === undefined ? [] : [`Tier: ${tier}.`]),
		...applied.written.map(
			(entry) => `Wrote ${entry.path} = ${shown(entry.value)}.`,
		),
		...applied.skipped.map(skippedLine),
		...(applied.written.length === 0 ? ["Wrote no key."] : []),
	].join("\n");
