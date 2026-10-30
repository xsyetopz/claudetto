// Counting names against a set, which the work mix and the re-read measure both do.

/** How many of `names` are in `set`, counting a repeat each time it appears. */
export const countIn = (
	names: readonly string[],
	set: ReadonlySet<string>,
): number => {
	let found = 0;
	for (const name of names) {
		if (set.has(name)) {
			found += 1;
		}
	}
	return found;
};
