// What setup tells the user of the tier row it applied: the keys and values it wrote, and each one it
// skipped with the reason. It states no share of a plan limit, because no row of this login backs
// one (`../window/report.ts`, `shareClaims`).

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

/** One line for each key written and one for each key skipped, under the tier that was read. */
export const tierReport = (tier: string, applied: Applied): string =>
	[
		`Tier: ${tier}.`,
		...applied.written.map(
			(entry) => `Wrote ${entry.path} = ${shown(entry.value)}.`,
		),
		...applied.skipped.map(skippedLine),
		...(applied.written.length === 0 ? ["Wrote no key."] : []),
	].join("\n");
