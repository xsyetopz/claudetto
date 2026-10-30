import { PLAN_CAPS, rowFor, type TierRow } from "./tiers.ts";

export interface TierReading {
	readonly row?: TierRow;
	readonly read: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

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

export const unknownTierLine = (read: string): string =>
	`The plan tier ${read} has no row in claudetto. Setup writes no tier row.`;
