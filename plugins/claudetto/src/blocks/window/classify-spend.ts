import type { ModelCompleteResult } from "claude-code";
import { isTokenRow, KEEP_MS, type TurnRow } from "./window.ts";

export const CLASSIFY_KEY = "window.classify";

export interface ClassifyRow {
	readonly at: number;
	readonly model: string;
	readonly inputTokens: number;
	readonly outputTokens: number;
	readonly cacheReadTokens: number;
	readonly cacheWriteTokens: number;
}

/** An unanswered call carries usage too, and a thinking-only reply spends real tokens. */
export const classifyRowOf = (
	model: string,
	reply: ModelCompleteResult,
	at: number,
): ClassifyRow => ({
	at,
	model,
	inputTokens: reply.usage.input_tokens,
	outputTokens: reply.usage.output_tokens,
	cacheReadTokens: reply.usage.cache_read_input_tokens,
	cacheWriteTokens: reply.usage.cache_creation_input_tokens,
});

export const keepClassify = (
	rows: readonly ClassifyRow[],
	row: ClassifyRow,
): ClassifyRow[] => [...rows.filter((old) => old.at > row.at - KEEP_MS), row];

const isClassifyRow = (value: unknown): value is ClassifyRow =>
	isTokenRow(value, "model", [
		"inputTokens",
		"outputTokens",
		"cacheReadTokens",
		"cacheWriteTokens",
	]);

export const classifyOf = (stored: unknown): ClassifyRow[] =>
	Array.isArray(stored) ? stored.filter(isClassifyRow) : [];

export const tokensOf = (row: ClassifyRow | TurnRow): number =>
	row.inputTokens +
	row.outputTokens +
	row.cacheReadTokens +
	row.cacheWriteTokens;
