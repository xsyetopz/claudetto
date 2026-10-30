// The harness builds the settings file itself, so a reading is one command with the names in it and
// no scratch file on disk can drift from the list the plugin ships.

import { planSetup } from "../../plugins/claudetto/src/tiers/setup.ts";

/** The settings text that denies each tool name, as Claude Code reads `permissions.deny`. */
export const denySettings = (names: readonly string[]): string =>
	JSON.stringify({ permissions: { deny: [...names] } });

/** The plan tier the shipped reading is taken on, fixed so that two machines read the same score. */
const TIER = "default_claude_max_20x";

/**
 * What `just setup` writes into an empty settings file on `TIER`, read from `planSetup` rather than
 * composed here. While this file composed its own list it carried three keys `tierSnippet` did not
 * write, so every figure of the inventory described settings no user had.
 */
export const shippedSettings = (): string =>
	JSON.stringify(
		planSetup({ oauthAccount: { organizationRateLimitTier: TIER } }, {})
			.write ?? {},
	);
