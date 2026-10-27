// The queue of the steps of a path (spec `handover`): they run in a timer after the hook, one after the other.

/** The time after which a handover that waits for its `/clear` is given up, so that the run cannot stay `running` forever. */
export const CLEAR_WAIT_MS = 60_000;

/** Runs `steps` in order, each after the one before ends. A failed step rejects, and the steps after it do not run. */
const runInOrder = async (
	steps: readonly (() => Promise<unknown>)[],
): Promise<void> => {
	const [first, ...rest] = steps;
	if (first === undefined) {
		return;
	}
	await first();
	await runInOrder(rest);
};

/** Queues the steps after the hook, each after the one before ends, and calls `release` when the run ends. A failed step ends the run. A run with a `waiting` resume prompt ends when the new session takes it, or when `expire` runs after `CLEAR_WAIT_MS`. */
export const queue = (
	after: (ms: number, run: () => Promise<unknown>) => unknown,
	steps: readonly (() => Promise<unknown>)[],
	wait: { isWaiting: boolean; expire: () => Promise<unknown> },
	release: () => void,
): void => {
	let isWaiting = wait.isWaiting;
	after(0, async () => {
		try {
			await runInOrder(steps);
		} catch {
			// A refused command leaves the session as it is.
			isWaiting = false;
		} finally {
			if (!isWaiting) {
				release();
			}
		}
	});
	if (isWaiting) {
		after(CLEAR_WAIT_MS, wait.expire);
	}
};
