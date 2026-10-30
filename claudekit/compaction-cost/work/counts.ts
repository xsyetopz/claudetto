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
