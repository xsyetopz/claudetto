// The harness builds the settings itself, so no scratch file on disk can drift from the shipped list.

import {
	groupLabels,
	keptSnippet,
} from "../../plugins/claudetto/src/tiers/groups.ts";
import { refusedPaths } from "../../plugins/claudetto/src/tiers/keys.ts";
import { applyTier } from "../../plugins/claudetto/src/tiers/merge.ts";
import { tierSnippet } from "../../plugins/claudetto/src/tiers/snippet.ts";
import { SNIPPET_ROW } from "../../plugins/claudetto/src/tiers/tiers.ts";

export const denySettings = (names: readonly string[]): string =>
	JSON.stringify({ permissions: { deny: [...names] } });

/** Runs the command's own pipeline rather than composing a list, which drifted from `tierSnippet`. */
export const shippedSettings = (): string => {
	const snippet = keptSnippet(
		tierSnippet(SNIPPET_ROW, process.platform),
		groupLabels(),
	);
	return JSON.stringify(applyTier({}, snippet, refusedPaths(snippet)).settings);
};
