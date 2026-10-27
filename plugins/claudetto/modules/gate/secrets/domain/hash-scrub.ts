// The scan of a text for the values of `Hashed` records: a rolling hash finds a position, and the slow hash confirms it.

import { ENV_CONFIRMS_MAX, ENV_VALUE_MIN } from "../../limits.ts";
import { MASKED } from "../../prompts.ts";
import { type Hashed, SALT_ID, slowHash } from "./hashes.ts";
import { headOf, ROLL } from "./rolling-hash.ts";

/** The positions of `text` where the first `ENV_HEAD_BITS` bits of the rolling hash of `size` characters are a key of `wanted`, and the records of the key. */
const windows = (
	text: string,
	size: number,
	wanted: ReadonlyMap<number, [string, Hashed[string]][]>,
	visit: (at: number, records: [string, Hashed[string]][]) => void,
): void => {
	if (wanted.size === 0 || text.length < size) {
		return;
	}
	let top = 1;
	for (let i = 1; i < size; i++) {
		top = Math.imul(top, ROLL);
	}
	let h = 0;
	for (let i = 0; i < text.length; i++) {
		if (i >= size) {
			h = (h - Math.imul(text.charCodeAt(i - size) + 1, top)) | 0;
		}
		h = (Math.imul(h, ROLL) + text.charCodeAt(i) + 1) | 0;
		if (i >= size - 1) {
			const records = wanted.get(headOf(h));
			if (records !== undefined) {
				visit(i - size + 1, records);
			}
		}
	}
};

/** The slow confirms of one call: how many are left, the hash of each text that a confirm ran on, and whether a find went unconfirmed. */
export interface Budget {
	left: number;
	isCut: boolean;
	seen: Map<string, string>;
	heads: Map<number, [string, Hashed[string]][]>;
}

/** A new budget of `ENV_CONFIRMS_MAX` confirms, with the records of `known` by head, built once for the call. */
export const newBudget = (known: Hashed = {}): Budget => {
	const heads = new Map<number, [string, Hashed[string]][]>();
	for (const [hash, record] of Object.entries(known)) {
		if (hash !== SALT_ID) {
			heads.set(record.head, [
				...(heads.get(record.head) ?? []),
				[hash, record],
			]);
		}
	}
	return { left: ENV_CONFIRMS_MAX, isCut: false, seen: new Map(), heads };
};

/** The slow hash of `found`, from the budget when it ran on `found` before, else one confirm of it. It is `undefined` and sets `isCut` when no confirm is left. */
const confirm = (
	budget: Budget,
	salt: string,
	found: string,
): string | undefined => {
	const seen = budget.seen.get(found);
	if (seen !== undefined) {
		return seen;
	}
	if (budget.left <= 0) {
		budget.isCut = true;
		return undefined;
	}
	budget.left--;
	const hash = slowHash(salt, found);
	budget.seen.set(found, hash);
	return hash;
};

/** `text` with each value of `known` replaced by `[value of KEY]`. The slow hash confirms each find, and it runs once for each text that a position gives. When `budget` has no confirm left, a find is masked with no confirm and `isCut` is set, because a mask that is wrong is safe and a value that shows is not. */
export const scrubHashed = (
	text: string,
	known: Hashed,
	budget: Budget = newBudget(known),
): string => {
	const salt = known[SALT_ID]?.key;
	if (salt === undefined) {
		return text;
	}
	const spans: [number, number, string][] = [];
	windows(text, ENV_VALUE_MIN, budget.heads, (from, records) => {
		for (const [id, { key, len }] of records) {
			const to = from + len;
			if (to > text.length) {
				continue;
			}
			const found = text.slice(from, to);
			const hash = confirm(budget, salt, found);
			if (hash === undefined || hash === id) {
				spans.push([from, to, key]);
			}
		}
	});
	if (spans.length === 0) {
		return text;
	}
	spans.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
	let out = "";
	let end = 0;
	for (const [from, to, key] of spans) {
		if (from < end) {
			end = Math.max(end, to);
			continue;
		}
		out += text.slice(end, from) + MASKED({ key });
		end = to;
	}
	return out + text.slice(end);
};
