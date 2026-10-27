// The values that an env file held, kept as hashes so that they stay replaced when the file is gone or the mod loads again in the same session (task 19.20 of change `redesign-0-4-0`).
// A record holds a slow hash of a value (`ENV_SLOW_ROUNDS` rounds of SHA-256 over the salt of the install), its length, its key, and the first `ENV_HEAD_BITS` bits of the rolling hash of its first characters. It holds no value.
// A record exists only for a value of `ENV_PERSIST_MIN` or more characters, because a short value falls to a brute force of its record fast. `$.state` has no file, so no tool call of the agent can read a record.
// The result is scanned with a rolling hash of the first characters at each position (`hash-scrub.ts`). Only a position that the rolling hash finds is confirmed with the slow hash.

import {
	ENV_HEAD_BITS,
	ENV_PERSIST_MIN,
	ENV_SLOW_ROUNDS,
	ENV_VALUE_MIN,
} from "../../limits.ts";
import { HEAD_MASK, head } from "./rolling-hash.ts";
import { sha256 } from "./sha256.ts";

/** The records by slow hash in hex. `len` counts the characters of the value, and `head` is the first `ENV_HEAD_BITS` bits of the rolling hash of its first `ENV_VALUE_MIN` characters. The record under `SALT_ID` holds the salt of the install as its `key`, with `len` 0 and `head` set to `ENV_HEAD_BITS`, so that records of a reload with another head size are told apart and dropped. */
export interface Hashed {
	[hash: string]: { key: string; len: number; head: number };
}

/** The id of the record that holds the salt. It is no hex of 64 digits, so no hash is equal to it. */
export const SALT_ID = "salt";

/** A new salt of 128 random bits, in hex. */
export const newSalt = (): string =>
	[...crypto.getRandomValues(new Uint8Array(16))]
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");

/** The slow hash of `value` under `salt`: `ENV_SLOW_ROUNDS` rounds of SHA-256, each over the last round, the salt, and the value. */
export const slowHash = (salt: string, value: string): string => {
	let h = sha256(salt + value);
	for (let i = 1; i < ENV_SLOW_ROUNDS; i++) {
		h = sha256(h + salt + value);
	}
	return h;
};

/** The record of a value of `ENV_PERSIST_MIN` or more characters, as `[hash, record]`. */
export const hashOf = (
	salt: string,
	key: string,
	value: string,
): [string, Hashed[string]] => [
	slowHash(salt, value),
	{ key, len: value.length, head: head(value.slice(0, ENV_VALUE_MIN)) },
];

const HEX64 = /^[0-9a-f]{64}$/;
const HEX32 = /^[0-9a-f]{32}$/;

/** Whether `h` is a head of `ENV_HEAD_BITS` bits. */
const isHead = (h: unknown): h is number =>
	typeof h === "number" && Number.isInteger(h) && h >= 0 && h <= HEAD_MASK;

/** Whether `value` is an object that is no array. */
const isPlainObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

/** Whether the salt record of `raw` is there with a head size other than `ENV_HEAD_BITS`. */
const isOldHead = (raw: Record<string, unknown>): boolean => {
	const salt = raw[SALT_ID];
	return (
		SALT_ID in raw && (!isPlainObject(salt) || salt["head"] !== ENV_HEAD_BITS)
	);
};

/** The records of `raw` that fit the shape of `Hashed`. A record that does not fit, such as one of an older version, is dropped. When the salt record has another head size than `ENV_HEAD_BITS`, it comes from a reload with an older head, and all records are dropped, because their heads would never match. */
export const validHashes = (raw: unknown): Hashed => {
	const out: Hashed = {};
	if (!isPlainObject(raw)) {
		return out;
	}
	if (isOldHead(raw)) {
		return out;
	}
	for (const [id, r] of Object.entries(raw)) {
		const fields = isPlainObject(r) ? r : {};
		const { key, len, head: h } = fields;
		if (
			typeof key !== "string" ||
			typeof len !== "number" ||
			!Number.isInteger(len)
		) {
			continue;
		}
		if (!isHead(h)) {
			continue;
		}
		const isSalt =
			id === SALT_ID && HEX32.test(key) && len === 0 && h === ENV_HEAD_BITS;
		const isRecord = HEX64.test(id) && key !== "" && len >= ENV_PERSIST_MIN;
		if (isSalt || isRecord) {
			out[id] = { key, len, head: h };
		}
	}
	return out;
};
