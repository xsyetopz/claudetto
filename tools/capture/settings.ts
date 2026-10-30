// The harness builds the settings file itself, so a reading is one command with the names in it and
// no scratch file on disk can drift from the list the plugin ships.

import {
	groupLabels,
	keptSnippet,
} from "../../plugins/claudetto/src/tiers/groups.ts";
import { refusedPaths } from "../../plugins/claudetto/src/tiers/keys.ts";
import { applyTier } from "../../plugins/claudetto/src/tiers/merge.ts";
import { tierSnippet } from "../../plugins/claudetto/src/tiers/snippet.ts";
import { SNIPPET_ROW } from "../../plugins/claudetto/src/tiers/tiers.ts";

/** The settings text that denies each tool name, as Claude Code reads `permissions.deny`. */
export const denySettings = (names: readonly string[]): string =>
	JSON.stringify({ permissions: { deny: [...names] } });

/**
 * What `/claudetto:setup` writes into an empty settings file for a person who keeps every group,
 * which is the most any install gets. It runs the command's own pipeline, `keptSnippet` then
 * `applyTier` with `refusedPaths`, rather than composing a list here: while this file composed its
 * own it carried three keys `tierSnippet` did not write, so every figure of the inventory described
 * settings no user had.
 *
 * `just setup` writes one key more, `autoMode`, whose environment facts are readings of this
 * repository (`UNSHIPPED_KEYS` of `tiers/groups.ts`). The figures here are of the install and not of
 * this checkout, because the figures are quoted to the reader of `README.md`.
 */
export const shippedSettings = (): string => {
	const snippet = keptSnippet(
		tierSnippet(SNIPPET_ROW, process.platform),
		groupLabels(),
	);
	return JSON.stringify(applyTier({}, snippet, refusedPaths(snippet)).settings);
};
