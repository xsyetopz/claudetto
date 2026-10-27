// The running `Monitor` tasks in `$.state`: the read and the write of the set.

import type { Watches } from "../domain/monitors.ts";

/** What the set needs: the held set, the time of the host, and a save. `mod.ts` builds it from `$`. */
export interface WatchIo {
	held: () => Promise<Watches | undefined>;
	now: () => Promise<number>;
	save: (held: Watches) => Promise<unknown>;
}

/** Runs `use` with the running set and the time of the host. A fault of the state gives `undefined`, and the state is a help for the agent, so it adds no stop. */
export const withWatches = async <T>(
	io: WatchIo,
	use: (held: Watches, now: number) => T | Promise<T>,
): Promise<T | undefined> => {
	try {
		const value = await io.held();
		return await use(value ?? {}, await io.now());
	} catch {
		return undefined;
	}
};

/** Sets the running set to `change` of the set now and the time of the host. */
export const updateWatches = (
	io: WatchIo,
	change: (held: Watches, now: number) => Watches,
): Promise<unknown> =>
	withWatches(io, (held, now) => io.save(change(held, now)));
