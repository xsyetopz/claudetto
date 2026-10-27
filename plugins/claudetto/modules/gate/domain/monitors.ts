// The running `Monitor` tasks of a session by command, so a second `Monitor` with the same command is refused (task 10.4, finding X8).

/** The running `Monitor` tasks by command. `until` is the deadline in milliseconds of the clock of the host, or 0 for no timeout. */
export interface Watches {
	[command: string]: { id: string; until: number };
}

/** The ID of the task that runs `command` at time `now`, or `undefined`. A task past its deadline does not run. */
export const runningTask = (
	watches: Watches,
	command: string,
	now: number,
): string | undefined => {
	const watch = Object.hasOwn(watches, command) ? watches[command] : undefined;
	return watch && (watch.until === 0 || now < watch.until)
		? watch.id
		: undefined;
};

/** `watches` with the task `id` of `command`. A `timeoutMs` of 0 or less means no deadline. */
export const withWatch = (
	watches: Watches,
	command: string,
	id: string,
	now: number,
	timeoutMs: number,
): Watches => ({
	...watches,
	[command]: { id, until: timeoutMs > 0 ? now + timeoutMs : 0 },
});

/** `watches` with the entries whose task ID `keep` accepts. */
export const keepWatches = (
	watches: Watches,
	keep: (id: string) => boolean,
): Watches =>
	Object.fromEntries(Object.entries(watches).filter(([, w]) => keep(w.id)));

/** The IDs of the `monitor` tasks of a `Stop` event. */
export const monitorIds = (
	tasks: readonly { id: string; type: string }[],
): Set<string> =>
	new Set(tasks.filter((t) => t.type === "monitor").map((t) => t.id));
