// A value kept in `$.state` that several hooks change at once. Parallel tool calls and parallel
// subagent starts raise their hooks together, so a read and a write apart would lose a count; the
// write lands only while the version is still the one read, and a miss reads again.

import { DENIAL_WRITE_TRIES_MAX } from "../gate/denials.ts";

/** What the change needs: the held value with its version, and a write that lands only on that version. Each hook builds it from `$`. */
export interface LedgerIo<T> {
	held: () => Promise<{ value: T | undefined; version: number }>;
	save: (value: T, version: number) => Promise<boolean>;
}

/** The new value of the ledger and what the change reports about it. */
export interface Changed<T, R> {
	readonly next: T;
	readonly out: R;
}

/**
 * Applies `change` to the held value and writes it, and gives what `change` reported for the write
 * that landed, or `undefined` when no try landed. A change that returns the held value unchanged
 * still writes it, which is harmless.
 */
export const changeLedger = async <T, R>(
	io: LedgerIo<T>,
	change: (held: T | undefined) => Changed<T, R>,
	tries: number = DENIAL_WRITE_TRIES_MAX,
): Promise<R | undefined> => {
	if (tries <= 0) {
		return undefined;
	}
	const { value, version } = await io.held();
	const made = change(value);
	return (await io.save(made.next, version))
		? made.out
		: changeLedger(io, change, tries - 1);
};
