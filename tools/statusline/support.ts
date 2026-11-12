import { statusOf } from "../../plugins/claudetto/statusline/main.ts";
import { plain } from "../../plugins/claudetto/statusline/width.ts";

/** A fixed clock: 2026-01-01T00:00:00Z. */
export const NOW = 1_767_225_600_000;
export const NOW_S = NOW / 1000;

export const BASE = {
	workspace: { current_dir: "/work/claudetto" },
	model: { id: "claude-opus-5-5", display_name: "Opus 5.5" },
	effort: { level: "high" },
	cost: { total_cost_usd: 0 },
	context_window: { total_input_tokens: 80_000, context_window_size: 200_000 },
};

/** The line file of a session on the dark theme with a 200k compaction window. */
const LINE = { changes: [], window: 200_000, theme: "dark" };

const PLAIN_ENV = { COLUMNS: "120", NO_COLOR: "1" };
const WIDE_ENV = { COLUMNS: "120" };

export type Fields = Record<string, unknown>;

/** The lines of the status line for `fields` merged over `BASE`, with the escapes removed. */
export const linesOf = (
	fields: Fields = {},
	env: Record<string, string | undefined> = PLAIN_ENV,
	base: Fields = BASE,
): string[] =>
	plain(statusOf(JSON.stringify({ ...base, ...fields }), env, NOW, LINE)).split(
		"\n",
	);

export const raw = (
	fields: Fields,
	env: Record<string, string | undefined> = WIDE_ENV,
	base: Fields = BASE,
): string => statusOf(JSON.stringify({ ...base, ...fields }), env, NOW, LINE);
