// Ordered async steps, for work whose steps depend on each other or on the order of their side effects.

const walk = async <T>(
	items: Iterator<T>,
	step: (item: T) => Promise<void>,
): Promise<void> => {
	const next = items.next();
	if (next.done) {
		return;
	}
	await step(next.value);
	await walk(items, step);
};

/** Runs `step` for each item of `items` one after the other, and each step ends before the next starts. */
export const eachInOrder = <T>(
	items: Iterable<T>,
	step: (item: T) => Promise<void>,
): Promise<void> => walk(items[Symbol.iterator](), step);

/** The results of `step` for each item of `items`, with the steps run one after the other. */
export const mapInOrder = async <T, R>(
	items: Iterable<T>,
	step: (item: T) => Promise<R>,
): Promise<R[]> => {
	const results: R[] = [];
	await eachInOrder(items, async (item) => {
		results.push(await step(item));
	});
	return results;
};
