import { DENIAL_WRITE_TRIES_MAX } from "../gate/denials.ts";

export interface LedgerIo<T> {
	held: () => Promise<{ value: T | undefined; version: number }>;
	save: (value: T, version: number) => Promise<boolean>;
}

export interface Changed<T, R> {
	readonly next: T;
	readonly out: R;
}

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
