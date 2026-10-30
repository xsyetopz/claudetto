// The pure half of the window recorder: how one `session.measure` becomes a row. The hooks that
// raise it and keep it in `$.store` are in `hooks.ts`; the reading of the rows is in
// `report.ts` (`design.md`, "Window Budget").

import type { SessionMeasureInput, TurnUsage } from "claude-code";

/** Where the turn rows are kept in `$.store`. */
export const ROWS_KEY = "window.rows";

/** Where the turns' own token counts are kept, the denominator of the weight. */
export const TURNS_KEY = "window.turns";

/** Where the last five-hour reading is kept, the base of the next delta. */
export const LAST_KEY = "window.last";

/** Where the dollars of the session so far are kept, for a login that has no rate-limit window. */
export const USD_KEY = "window.usd";

/** The `kind` of the window that `points` are counted in. */
const FIVE_HOUR = "five_hour";

/** The `kind` of the window that `sevenPoints` are counted in. */
const SEVEN_DAY = "seven_day";

/**
 * How long a row is kept. `seven_day` is the longest window the engine reports, beside `five_hour`
 * and a gateway's `spend_limit`, so a row older than that prices nothing the user still has to
 * spend. The bound is that window rather than a count of rows, because a count would be a number
 * picked to fit the store's own 4 MiB of JSON and would hold rows that price nothing.
 */
export const KEEP_MS = 7 * 24 * 60 * 60 * 1000;

/** One point is the finest step `percentUsed` reports: one decimal. */
const TENTH = 10;

/** Who spent the turn. The engine names the first three; the other two are for a call of our own code. */
export type Source =
	| "main"
	| "subagent"
	| "compaction"
	| "handoff"
	| "classifier";

/** A loop that is running now: a turn or a compaction, by the id its start event gave it. */
export interface Active {
	readonly id: string;
	readonly source: Source;
}

/** What one measurement cost, in the units the engine reports. */
export interface WindowRow {
	readonly at: number;
	/** The turn of the main loop that the work belongs to, or none when no turn ran. */
	readonly task: string;
	readonly source: Source;
	/** Input tokens of the last response: uncached, cache-written and cache-read together. */
	readonly tokens?: number;
	readonly window: number;
	readonly percent?: number;
	/**
	 * Points the five-hour window moved since the reading before. Absent where the measurement had no
	 * five-hour reading or that window reset: absence is not a zero.
	 */
	readonly points?: number;
	/** Points the seven-day window moved since the reading before, absent on the same terms as `points`. */
	readonly sevenPoints?: number;
	/** Dollars the session cost since the reading before. */
	readonly usd: number;
	/**
	 * Set on the first row written once a compaction has ended, so the fall in `tokens` beside the row
	 * before it is that compaction's and not a turn's. The mark is on the row after rather than on a
	 * row of `source` `compaction`, because whether `session.measure` fires inside a compaction at all
	 * is unread, while the row after it is the nearest reading to the window the compaction left.
	 *
	 * It is the nearest reading and not that window itself, which a run of 2026-10-30 showed: a step
	 * that kept working after its compaction ended at 23,423 tokens against the 22,710 of the row
	 * before it, so `tokens` here had risen rather than fallen. The row holds where the session stood
	 * when the row was written, so a reader of this mark gets the compaction plus whatever followed it
	 * in the same row, and only a session measured per request narrows that.
	 */
	readonly afterCompaction?: true;
}

/** What one completed turn cost, as `turn.complete` states it: the counts of its responses, summed. */
export interface TurnRow {
	readonly at: number;
	readonly turn: string;
	/** The turn of the main loop that the work belongs to. */
	readonly task: string;
	readonly source: Source;
	readonly model: string;
	readonly inputTokens: number;
	readonly outputTokens: number;
	readonly cacheReadTokens: number;
	readonly cacheWriteTokens: number;
}

/** The reading that the next one is compared with. */
export interface Reading {
	readonly fiveHour?: number;
	readonly resetsAt?: string;
	readonly sevenDay?: number;
	readonly sevenResetsAt?: string;
	readonly usd: number;
}

/** The newest loop spent the measured response; the turn of the main loop under it is the task. */
export const tagOf = (
	active: readonly Active[],
): { source: Source; task: string } => ({
	source: active.at(-1)?.source ?? "main",
	task: active.find((entry) => entry.source === "main")?.id ?? "",
});

const tenth = (value: number): number => Math.round(value * TENTH) / TENTH;

type Limit = SessionMeasureInput["rateLimits"][number];

/** Points one window moved, or none when it has no reading, no base, or spans a reset. */
const moved = (
	limit: Limit | undefined,
	base: { percent: number | undefined; resetsAt: string | undefined },
): number | undefined =>
	limit === undefined ||
	base.percent === undefined ||
	base.resetsAt !== limit.resetsAt ||
	limit.percentUsed < base.percent
		? undefined
		: tenth(limit.percentUsed - base.percent);

/**
 * The row of one measurement, and the reading to compare the next with. Each window is compared with
 * its own base: a pair whose `resetsAt` differs, or whose percent went down, spans a reset of that
 * window alone, so it gives no delta for it while the other window keeps its own. A measurement with
 * neither window gives neither row nor reading (an API key), and one with no delta in any window gives
 * a reading only.
 */
export const measureRow = (
	input: SessionMeasureInput,
	last: Reading | undefined,
	tag: { source: Source; task: string; afterCompaction?: true },
	at: number,
): { row?: WindowRow; reading?: Reading } => {
	const five = input.rateLimits.find((limit) => limit.kind === FIVE_HOUR);
	const seven = input.rateLimits.find((limit) => limit.kind === SEVEN_DAY);
	if (five === undefined && seven === undefined) {
		return {};
	}
	const usd = input.cost?.usd ?? last?.usd ?? 0;
	const reading: Reading = {
		usd,
		...(five === undefined ? {} : { fiveHour: five.percentUsed }),
		...(five?.resetsAt === undefined ? {} : { resetsAt: five.resetsAt }),
		...(seven === undefined ? {} : { sevenDay: seven.percentUsed }),
		...(seven?.resetsAt === undefined ? {} : { sevenResetsAt: seven.resetsAt }),
	};
	if (last === undefined) {
		return { reading };
	}
	const points = moved(five, {
		percent: last.fiveHour,
		resetsAt: last.resetsAt,
	});
	const sevenPoints = moved(seven, {
		percent: last.sevenDay,
		resetsAt: last.sevenResetsAt,
	});
	if (points === undefined && sevenPoints === undefined) {
		return { reading };
	}
	const { tokens, window, percent } = input.context;
	const row: WindowRow = {
		at,
		...tag,
		window,
		usd: Math.max(0, usd - last.usd),
		...(points === undefined ? {} : { points }),
		...(sevenPoints === undefined ? {} : { sevenPoints }),
		...(tokens === undefined ? {} : { tokens }),
		...(percent === undefined ? {} : { percent }),
	};
	return { row, reading };
};

/** The rows with one more, dropping each one older than `KEEP_MS` before the new row's own time. */
const kept = <T extends { readonly at: number }>(
	rows: readonly T[],
	row: T,
): T[] => [...rows.filter((old) => old.at > row.at - KEEP_MS), row];

/** The measure rows with one more, those past `KEEP_MS` dropped. */
export const keepRows = (
	rows: readonly WindowRow[],
	row: WindowRow,
): WindowRow[] => kept(rows, row);

const isRow = (value: unknown): value is WindowRow =>
	typeof value === "object" &&
	value !== null &&
	("points" in value
		? typeof value.points === "number"
		: "sevenPoints" in value && typeof value.sevenPoints === "number") &&
	"task" in value &&
	typeof value.task === "string";

/** The rows out of what the store gave back, which is any JSON: what is not a row is dropped. */
export const rowsOf = (stored: unknown): WindowRow[] =>
	Array.isArray(stored) ? stored.filter(isRow) : [];

const numberAt = (stored: object, key: string): number | undefined => {
	const value: unknown = Object.entries(stored).find(([k]) => k === key)?.[1];
	return typeof value === "number" ? value : undefined;
};

const textAt = (stored: object, key: string): string | undefined => {
	const value: unknown = Object.entries(stored).find(([k]) => k === key)?.[1];
	return typeof value === "string" ? value : undefined;
};

/** The last reading out of what the store gave back, or none. */
export const readingOf = (stored: unknown): Reading | undefined => {
	if (typeof stored !== "object" || stored === null) {
		return undefined;
	}
	const usd = numberAt(stored, "usd");
	if (usd === undefined) {
		return undefined;
	}
	const fiveHour = numberAt(stored, "fiveHour");
	const resetsAt = textAt(stored, "resetsAt");
	const sevenDay = numberAt(stored, "sevenDay");
	const sevenResetsAt = textAt(stored, "sevenResetsAt");
	return fiveHour === undefined && sevenDay === undefined
		? undefined
		: {
				usd,
				...(fiveHour === undefined ? {} : { fiveHour }),
				...(resetsAt === undefined ? {} : { resetsAt }),
				...(sevenDay === undefined ? {} : { sevenDay }),
				...(sevenResetsAt === undefined ? {} : { sevenResetsAt }),
			};
};

/** The row of a completed turn, or none when `usage` is absent because nothing counted. */
export const turnRow = (
	turn: string,
	usage: TurnUsage | undefined,
	tag: { source: Source; task: string },
	at: number,
): TurnRow | undefined =>
	usage === undefined
		? undefined
		: {
				at,
				turn,
				...tag,
				model: usage.model,
				inputTokens: usage.input_tokens,
				outputTokens: usage.output_tokens,
				cacheReadTokens: usage.cache_read_input_tokens,
				cacheWriteTokens: usage.cache_creation_input_tokens,
			};

/** The input side of a turn: uncached, cache-read and cache-written, without the output. */
export const inputOf = (row: TurnRow): number =>
	row.inputTokens + row.cacheReadTokens + row.cacheWriteTokens;

/** The turn rows with one more, those past `KEEP_MS` dropped. */
export const keepTurns = (rows: readonly TurnRow[], row: TurnRow): TurnRow[] =>
	kept(rows, row);

const isTurn = (value: unknown): value is TurnRow =>
	typeof value === "object" &&
	value !== null &&
	"task" in value &&
	typeof value.task === "string" &&
	"inputTokens" in value &&
	typeof value.inputTokens === "number" &&
	"cacheReadTokens" in value &&
	typeof value.cacheReadTokens === "number" &&
	"cacheWriteTokens" in value &&
	typeof value.cacheWriteTokens === "number";

/** The turn rows out of what the store gave back, which is any JSON: what is not a row is dropped. */
export const turnsOf = (stored: unknown): TurnRow[] =>
	Array.isArray(stored) ? stored.filter(isTurn) : [];
