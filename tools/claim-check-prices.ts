// Prices, and the small helpers that read untrusted JSON, for the claim-check run. The engine loads this module, so it uses no Bun or node API.
import { isRecord } from "../plugins/claudetto/hooks/tools.ts";

/** The token counts of one response. */
export interface Usage {
	readonly input_tokens: number;
	readonly output_tokens: number;
	readonly cache_read_input_tokens: number;
	readonly cache_creation_input_tokens: number;
}

export const HAIKU = "claude-haiku-5-5";
export const SONNET = "claude-sonnet-5-5";
/** USD per million tokens. */
export interface Price {
	readonly input: number;
	readonly output: number;
	readonly cacheRead: number;
	readonly cacheWrite: number;
}

/** Throws `message`. */
export const fail = (message: string): never => {
	throw new Error(message);
};

/** The property `name` of a record, else `undefined`. */
export const field = (value: unknown, name: string): unknown =>
	isRecord(value) ? value[name] : undefined;

/** `value` as a list of strings, else an error. */
export const strings = (value: unknown): string[] =>
	Array.isArray(value) && value.every((item) => typeof item === "string")
		? value
		: fail("A case field is not a list of strings.");

/** The non-empty lines of a JSONL text. */
export const lines = (text: string): string[] =>
	text.split("\n").filter((line) => line.trim() !== "");

export const numberOf = (value: unknown): number =>
	typeof value === "number" ? value : 0;

/** USD of one response's usage. */
export const costOf = (price: Price, usage: Usage): number =>
	(usage.input_tokens * price.input +
		usage.output_tokens * price.output +
		usage.cache_read_input_tokens * price.cacheRead +
		usage.cache_creation_input_tokens * price.cacheWrite) /
	1_000_000;

const PRICE_KEYS = ["input", "output", "cacheRead", "cacheWrite"];

/** The prices of the two models, from parsed JSON of USD per million tokens; `source` names the file in an error. */
export const pricesOf = (
	raw: unknown,
	source: string,
): Record<string, Price> => {
	const price = (model: string): Price => {
		const row = field(raw, model);
		if (!PRICE_KEYS.every((key) => typeof field(row, key) === "number")) {
			return fail(`${source} has no complete price for ${model}.`);
		}
		return {
			input: numberOf(field(row, "input")),
			output: numberOf(field(row, "output")),
			cacheRead: numberOf(field(row, "cacheRead")),
			cacheWrite: numberOf(field(row, "cacheWrite")),
		};
	};
	return { [HAIKU]: price(HAIKU), [SONNET]: price(SONNET) };
};
