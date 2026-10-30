// The dollars of a request from its token counts, at the rates of `table.ts`.

import { type ModelPrice, PRICES, type PriceRow } from "./table.ts";

/** The token counts of a message `usage`; a count the event omits is read as 0. */
export interface Usage {
	input_tokens?: number;
	output_tokens?: number;
	cache_creation_input_tokens?: number;
	cache_read_input_tokens?: number;
}

/** Which cache a write went into, which sets its rate. */
export type CacheTtl = "5m" | "1h";

/** Dollars for `tokens` at a rate in dollars per million. */
export const money = (tokens: number, rate: number): number =>
	(tokens * rate) / 1e6;

/** The prompt of a request, which is what a tiered model compares with its limit: input, cache read, and cache write. */
export const promptTokens = (usage: Usage): number =>
	(usage.input_tokens ?? 0) +
	(usage.cache_read_input_tokens ?? 0) +
	(usage.cache_creation_input_tokens ?? 0);

/** The price of `model`, or an error naming it, so a model missing from the table is never billed at 0. */
export const priceOf = (model: string): ModelPrice => {
	const price = PRICES[model];
	if (price === undefined) {
		throw new Error(`no price for the model \`${model}\``);
	}
	return price;
};

/** The row that bills a request of `prompt` tokens: the long row when the model has one and the prompt is over its limit. */
export const rowFor = (price: ModelPrice, prompt: number): PriceRow =>
	price.long !== undefined && prompt > price.long.overTokens
		? price.long.row
		: price.base;

/**
 * The dollars one request of `usage` costs on `model`, with cache writes at the rate of `ttl`.
 * It throws when the table holds no rate for that `ttl` and the request wrote to the cache, because a
 * write priced at 0 would hide a price nobody has read.
 */
export const costOf = (
	model: string,
	usage: Usage,
	ttl: CacheTtl = "5m",
): number => {
	const row = rowFor(priceOf(model), promptTokens(usage));
	const writes = usage.cache_creation_input_tokens ?? 0;
	const writeRate = ttl === "5m" ? row.cacheWrite5m : row.cacheWrite1h;
	if (writeRate === undefined && writes > 0) {
		throw new Error(
			`no \`${ttl}\` cache write price for the model \`${model}\``,
		);
	}
	return (
		money(usage.input_tokens ?? 0, row.input) +
		money(usage.output_tokens ?? 0, row.output) +
		money(usage.cache_read_input_tokens ?? 0, row.cacheRead) +
		money(writes, writeRate ?? 0)
	);
};
