/**
 * The tokens the account spent from 2026-10-27 to 2026-11-02, the week whose limit ran out, summed from the
 * transcripts under `~/.claude/projects/`. The limit is spent in tokens, so a share of it is counted in tokens.
 */
export const WEEKLY_TOKENS = 3_200_000_000;

/** The percent of the weekly limit that `tokens` take. */
export const weeklyShare = (tokens: number): number =>
	(tokens / WEEKLY_TOKENS) * 100;

// Two significant digits keep a run of a few thousand tokens from printing as 0.00%.
export const shareText = (share: number): string =>
	`${Number(share.toPrecision(2))}%`;
