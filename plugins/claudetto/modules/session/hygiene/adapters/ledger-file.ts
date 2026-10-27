// The edit ledger of the `hygiene` slice in the private store of the plugin: its key, its read, its write with a retry, and the hash of a file.

import {
	GONE,
	hash64,
	type LedgerLine,
	ledgerKey,
	parseLedger,
} from "../../../project/domain/ledger.ts";
import { withEdit } from "../domain/ledger.ts";
import { LEDGER_WRITE_TRIES } from "../limits.ts";

/** The calls that the helpers make. The mod gives each call, because the mod runtime follows `$` into no imported arrow function. */
export interface LedgerPort {
	readonly fs: { read: (path: string) => Promise<string> };
	readonly session: { root: () => Promise<string> };
	readonly store: {
		get: (key: string) => Promise<unknown>;
		set: (key: string, value: unknown) => Promise<unknown>;
	};
}

export const keyOf = async (io: LedgerPort): Promise<string> =>
	ledgerKey(await io.session.root());

export const readLedger = async (io: LedgerPort, key: string) =>
	parseLedger(await io.store.get(key));

const same = (a: LedgerLine, b: LedgerLine): boolean =>
	a.path === b.path &&
	a.hash === b.hash &&
	a.session === b.session &&
	a.agent === b.agent &&
	a.via === b.via;

/** The last write of the ledger. Each write waits for it, so two calls at the same time keep both lines. */
let recorded: Promise<void> = Promise.resolve();

/** Adds `added` to the ledger of the store. A `get` and a `set` are not atomic together, so a write that another session overwrote runs again, at most `LEDGER_WRITE_TRIES` times. */
export const record = (
	io: LedgerPort,
	added: readonly LedgerLine[],
): Promise<void> => {
	const attempt = async (key: string, tries: number): Promise<void> => {
		if (tries <= 0) {
			return;
		}
		let lines = await readLedger(io, key);
		for (const line of added) {
			lines = withEdit(lines, line);
		}
		await io.store.set(key, lines);
		const held = await readLedger(io, key);
		if (added.every((a) => held.some((h) => same(h, a)))) {
			return;
		}
		await attempt(key, tries - 1);
	};
	const previous = recorded;
	recorded = (async () => {
		await previous;
		try {
			await attempt(await keyOf(io), LEDGER_WRITE_TRIES);
		} catch {
			// A failed write ends this record, and the next one still runs.
		}
	})();
	return recorded;
};

/** The hash of the content of `path`, or `GONE` for a file that is missing or unreadable. */
export const hashOf = async (
	io: { readonly fs: Pick<LedgerPort["fs"], "read"> },
	path: string,
): Promise<string> => {
	try {
		return hash64(await io.fs.read(path));
	} catch {
		return GONE;
	}
};
