// The records of the values of env files in `$.state`, written with a version check and merged when a parallel call wrote first.

import {
	ENV_HASHES_PER_READ,
	ENV_HEAD_BITS,
	ENV_PERSIST_MIN,
	ENV_STATE_TRIES_MAX,
	ENV_VALUES_MAX,
} from "../../limits.ts";
import { type Entry, needlesOf } from "../domain/env.ts";
import {
	type Hashed,
	hashOf,
	newSalt,
	SALT_ID,
	validHashes,
} from "../domain/hashes.ts";

/** The records of the state: `get` reads them with their version, and `set` writes them only when the version is still the one read, and gives whether it did. */
export interface HashState {
	get: () => Promise<{ value: unknown; version: number }>;
	set: (known: Hashed, ifVersion: number) => Promise<boolean>;
}

/** The texts that this run put in the state, so that the state is written only for a new one. */
const noted = new Set<string>();

/** The records that a write to the state has not set yet, by needle, so that a write that missed does not hash again. The salt stands apart, because a state with no salt gets a new one in each try. */
const unsaved = new Map<
	string,
	{ salt: string; hash: string; record: Hashed[string] }
>();
let unsavedSalt: string | undefined;

/** Adds to `known` a record for each needle of a value of `ENV_PERSIST_MIN` or more characters that a run has not noted, and gives whether it added one, whether `ENV_VALUES_MAX` left a needle without a record, and the needles that the state holds once `known` is written. A needle that is shorter, such as a short line of a long value, gets no record. A needle whose write missed keeps its hash in `unsaved`. */
const persist = (
	known: Hashed,
	entries: readonly Entry[],
): { isChanged: boolean; isFull: boolean; held: string[] } => {
	let isChanged = false;
	let isFull = false;
	let made = 0;
	const needles: string[] = [];
	const longs = entries.filter((e) => e.value.length >= ENV_PERSIST_MIN);
	for (const [needle, key] of needlesOf(longs)) {
		if (noted.has(needle) || needle.length < ENV_PERSIST_MIN) {
			continue;
		}
		if (Object.keys(known).length > ENV_VALUES_MAX) {
			isFull = true;
			break;
		}
		if (made >= ENV_HASHES_PER_READ) {
			break;
		}
		const salt = known[SALT_ID]?.key ?? unsavedSalt ?? newSalt();
		unsavedSalt = salt;
		let staged = unsaved.get(needle);
		if (staged?.salt !== salt || staged.record.key !== key) {
			const [hash, record] = hashOf(salt, key, needle);
			staged = { salt, hash, record };
			unsaved.set(needle, staged);
			made++;
		}
		if (!(staged.hash in known)) {
			known[SALT_ID] = { key: salt, len: 0, head: ENV_HEAD_BITS };
			known[staged.hash] = staged.record;
			isChanged = true;
		}
		needles.push(needle);
	}
	return { isChanged, isFull, held: needles };
};

/** The records of the state with those of `entries` added, written with `ifVersion` up to `ENV_STATE_TRIES_MAX` tries: a try misses when a parallel call wrote first, and then the records are read again and merged. A needle is noted only after its write is set, so a miss is tried again by the next call, which writes the hashes of `unsaved` and makes no new one. Gives the records of the last try, and whether `ENV_VALUES_MAX` left a value without a record. */
export const saveHashes = async (
	state: HashState,
	entries: readonly Entry[],
	read: { value: unknown; version: number },
	tries = 1,
): Promise<{ known: Hashed; isFull: boolean }> => {
	const known = validHashes(read.value);
	// A record that does not fit the shape is dropped, and the state is written without it.
	const isDropped =
		Object.keys(known).length !== Object.keys(read.value ?? {}).length;
	const { isChanged, isFull, held: needles } = persist(known, entries);
	const isSet =
		!(isChanged || isDropped) || (await state.set(known, read.version));
	if (isSet) {
		for (const needle of needles) {
			noted.add(needle);
			unsaved.delete(needle);
		}
		if (unsaved.size === 0) {
			unsavedSalt = undefined;
		}
	}
	if (isSet || tries >= ENV_STATE_TRIES_MAX) {
		return { known, isFull };
	}
	return saveHashes(state, entries, await state.get(), tries + 1);
};
