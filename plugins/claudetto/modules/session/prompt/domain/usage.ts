// The usage line of `session.measure` (spec `usage-awareness`, "Usage Line"): the line waits in the usage value until the next request takes it.

import {
	type Shares,
	type Usage,
	WINDOW_NAMES,
	WINDOWS,
} from "../../domain/usage.ts";
import { bandOf } from "../../limits.ts";
import { USAGE_LINE, USAGE_SHARE } from "../prompts.ts";

/**
 * The usage value after a measurement with `shares`, or `null` when `shares` is empty (an API key has no rate limits).
 * The line is new when the band of a window differs from its last band, and an older line that no request took is replaced.
 */
export const nextUsage = (
	held: Usage | undefined,
	shares: Shares,
): Usage | null => {
	const seen = WINDOWS.filter((w) => shares[w] !== undefined);
	if (seen.length === 0) {
		return null;
	}
	const bands = Object.fromEntries(
		seen.flatMap((w) => {
			const share = shares[w];
			return share === undefined ? [] : [[w, bandOf(share)] as const];
		}),
	);
	const changed = seen.some((w) => bands[w] !== held?.bands[w]);
	const line = changed
		? USAGE_LINE({
				shares: seen
					.map((w) =>
						USAGE_SHARE({
							name: WINDOW_NAMES[w],
							percent: String(shares[w]),
							band: bands[w] ?? "",
						}),
					)
					.join(" and "),
			})
		: held?.line;
	return {
		bands: { ...held?.bands, ...bands },
		start: { ...shares, ...held?.start },
		...(line === undefined ? {} : { line }),
	};
};
