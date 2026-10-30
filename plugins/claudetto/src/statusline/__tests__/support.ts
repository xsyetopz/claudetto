import { statusOf } from "../main.ts";
import { plain } from "../width.ts";

/** A fixed clock: 2026-01-01T00:00:00Z. */
export const NOW = 1_767_225_600_000;
export const NOW_S = NOW / 1000;

export const BASE = {
	workspace: { current_dir: "/work/claudetto" },
	model: { id: "claude-opus-5-5", display_name: "Opus 5.5" },
	effort: { level: "high" },
	cost: { total_cost_usd: 0 },
	context_window: { used_percentage: 40, context_window_size: 200_000 },
};

export type Fields = Record<string, unknown>;

/** The lines of the status line for `fields` merged over `BASE`, with the escapes removed. */
export const linesOf = (
	fields: Fields = {},
	env: Record<string, string | undefined> = { COLUMNS: "120", NO_COLOR: "1" },
	base: Fields = BASE,
): string[] =>
	plain(statusOf(JSON.stringify({ ...base, ...fields }), env, NOW)).split("\n");

export const raw = (
	fields: Fields,
	env: Record<string, string | undefined> = { COLUMNS: "120" },
	base: Fields = BASE,
): string => statusOf(JSON.stringify({ ...base, ...fields }), env, NOW);
