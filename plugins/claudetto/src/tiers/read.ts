// The tier of the login, read from `.claude.json`. Pure over the parsed file, so a test hands it a
// plain object and no file is read here.

import { PLAN_CAPS, rowFor, type TierRow } from "./tiers.ts";

/** What `readTier` found in `.claude.json`: the matching row if any, and the tier names as read, for a message when no row matches. */
export interface TierReading {
	/** The row of the tier, or none when the table has no row for what was read. */
	readonly row?: TierRow;
	/** The tier names that were read, joined, or `none` with no login. */
	readonly read: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * The row for the login in `state`, the parsed `.claude.json`. The tier is the first of
 * `organizationRateLimitTier` and `organizationType` of `oauthAccount` that is a key of `PLAN_CAPS`.
 */
export const readTier = (state: unknown): TierReading => {
	const account =
		isRecord(state) && isRecord(state["oauthAccount"])
			? state["oauthAccount"]
			: {};
	const names = [
		account["organizationRateLimitTier"],
		account["organizationType"],
	].filter((name): name is string => typeof name === "string");
	const known = names.find((name) => Object.hasOwn(PLAN_CAPS, name));
	const row = known === undefined ? undefined : rowFor(known);
	return row === undefined
		? { read: names.join(", ") || "none" }
		: { row, read: row.tier };
};

/** What the user is told when the table has no row for the tier that was read. */
export const unknownTierLine = (read: string): string =>
	`The plan tier ${read} has no row in claudetto. Setup writes no tier row.`;
