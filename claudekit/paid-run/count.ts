// A planned paid run replayed on the fake API: what each request would send, before any of it is paid for.

import { startFakeApi } from "../api/fake.ts";
import { comparePrefix, type PrefixMatch } from "./prefix.ts";

/** Tokens of one request body. */
export type Counter = (raw: string) => number;

/** About four characters to a token, which is a size to compare with an approved one and not a bill. */
export const estimateTokens: Counter = (raw) => Math.ceil(raw.length / 4);

/** One replayed request. */
export interface Row {
	readonly index: number;
	readonly tokens: number;
	/** The request against the warm one. */
	readonly prefix: PrefixMatch;
}

/** The replayed run. */
export interface Counted {
	readonly rows: readonly Row[];
	readonly total: number;
}

/** `count` replaces the estimate; `warm` is the index of the request meant to warm the cache. */
export interface ReplayOptions {
	readonly count?: Counter;
	readonly warm?: number;
}

// One request at a time, so the bodies the fake keeps stay in plan order.
async function* postInOrder(
	url: string,
	planned: readonly unknown[],
): AsyncGenerator<Response> {
	for (const body of planned) {
		yield fetch(`${url}/v1/messages`, {
			method: "POST",
			body: JSON.stringify(body),
		});
	}
}

/** Posts each planned request body to the fake API and reads back what it kept. */
export const replayRun = async (
	planned: readonly unknown[],
	options: ReplayOptions = {},
): Promise<Counted> => {
	const count = options.count ?? estimateTokens;
	const api = startFakeApi();
	try {
		for await (const answer of postInOrder(api.url, planned)) {
			await answer.arrayBuffer();
		}
		const seen: unknown[] = api.bodies.map((raw) => JSON.parse(raw));
		const warm = seen[options.warm ?? 0];
		const rows = api.bodies.map(
			(raw, index): Row => ({
				index,
				tokens: count(raw),
				prefix: comparePrefix(warm, seen[index]),
			}),
		);
		let total = 0;
		for (const row of rows) {
			total += row.tokens;
		}
		return { rows, total };
	} finally {
		await api.stop();
	}
};
