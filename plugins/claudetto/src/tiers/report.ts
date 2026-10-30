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

/**
 * One line for each key written and one for each key skipped, under the tier that was read.
 *
 * `tier` is `undefined` for a caller that read no plan, and then no tier line is printed. The
 * `command.run` hook is such a caller: a hooks module cannot reach `.claude.json`, which is not
 * settings, so it composes from `SNIPPET_ROW` and knows nothing of the login's plan
 * (`./tiers.ts:110`). Printing that row's own tier there would tell every user they are on the plan
 * of whichever row the constant happens to name, which is a fact about this code and not about them.
 */
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
