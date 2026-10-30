import type { SessionMeasureInput, TurnUsage } from "claude-code";

export const ROWS_KEY = "window.rows";

export const TURNS_KEY = "window.turns";

export const LAST_KEY = "window.last";

export const USD_KEY = "window.usd";

const FIVE_HOUR = "five_hour";

const SEVEN_DAY = "seven_day";

export const KEEP_MS = 7 * 24 * 60 * 60 * 1000;

/** One point is the finest step `percentUsed` reports: one decimal. */
const TENTH = 10;

export type Source =
	| "main"
	| "subagent"
	| "compaction"
	| "handoff"
	| "classifier";

export interface Active {
	readonly id: string;
	readonly source: Source;
}

export interface WindowRow {
	readonly at: number;
	readonly task: string;
	readonly source: Source;
	/** Input tokens of the last response: uncached, cache-written and cache-read together. */
	readonly tokens?: number;
	readonly window: number;
	readonly percent?: number;
	readonly points?: number;
	readonly sevenPoints?: number;
	readonly usd: number;
	readonly afterCompaction?: true;
}

export interface TurnRow {
	readonly at: number;
	readonly turn: string;
	readonly task: string;
	readonly source: Source;
	readonly model: string;
	readonly inputTokens: number;
	readonly outputTokens: number;
	readonly cacheReadTokens: number;
	readonly cacheWriteTokens: number;
}

export interface Reading {
	readonly fiveHour?: number;
	readonly resetsAt?: string;
	readonly sevenDay?: number;
	readonly sevenResetsAt?: string;
	readonly usd: number;
}

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

const kept = <T extends { readonly at: number }>(
	rows: readonly T[],
	row: T,
): T[] => [...rows.filter((old) => old.at > row.at - KEEP_MS), row];

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

export const inputOf = (row: TurnRow): number =>
	row.inputTokens + row.cacheReadTokens + row.cacheWriteTokens;

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

export const turnsOf = (stored: unknown): TurnRow[] =>
	Array.isArray(stored) ? stored.filter(isTurn) : [];
