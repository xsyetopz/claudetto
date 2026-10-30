// The one table of per-model prices. A price is read here and nowhere else, so a rate that changes is
// changed once.

/** Dollars per million tokens, by billed line. A cache write of a TTL the sources do not state is absent. */
export interface PriceRow {
	readonly input: number;
	readonly output: number;
	readonly cacheRead: number;
	/** The write into the 5-minute cache. */
	readonly cacheWrite5m?: number;
	/** The write into the 1-hour cache. */
	readonly cacheWrite1h?: number;
}

/** What one model charges: a row, and for a model that tiers by prompt size, the row for prompts above that size. */
export interface ModelPrice {
	readonly base: PriceRow;
	readonly long?: {
		/** A prompt of more tokens than this, counting input, cache read, and cache write, is billed at `row`. */
		readonly overTokens: number;
		readonly row: PriceRow;
	};
}

/**
 * The prices of the models the harnesses run, from the platform pricing page. The `claude-opus-5-5`
 * row and the `1h` writes of `claude-haiku-5-5` come from `docs/evidence/usage-evidence/usage-evidence.md`
 * and `docs/models.md`.
 */
export const PRICES: Readonly<Record<string, ModelPrice>> = {
	"claude-opus-5-5": {
		base: {
			input: 4,
			output: 20,
			cacheRead: 0.2,
			cacheWrite5m: 5,
			cacheWrite1h: 8,
		},
	},
	"claude-sonnet-5-5": {
		base: { input: 2, output: 10, cacheRead: 0.1, cacheWrite5m: 2.5 },
	},
	"claude-sonnet-5": {
		base: { input: 2, output: 10, cacheRead: 0.2, cacheWrite5m: 2.5 },
	},
	"claude-haiku-5-5": {
		base: {
			input: 0.1,
			output: 0.5,
			cacheRead: 0.01,
			cacheWrite5m: 0.125,
			cacheWrite1h: 0.2,
		},
		long: {
			overTokens: 100_000,
			row: {
				input: 0.5,
				output: 2.5,
				cacheRead: 0.05,
				cacheWrite5m: 0.625,
				cacheWrite1h: 1,
			},
		},
	},
};
