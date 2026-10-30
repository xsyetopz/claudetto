// Runs of async work one after another, because the forks of a size share one folder.

export const eachInOrder = async <T>(
	items: Iterable<T>,
	fn: (item: T) => Promise<void>,
): Promise<void> => {
	const it = items[Symbol.iterator]();
	const next = async (): Promise<void> => {
		const step = it.next();
		if (step.done) {
			return;
		}
		await fn(step.value);
		await next();
	};
	await next();
};

export const mapInOrder = async <T, R>(
	items: Iterable<T>,
	fn: (item: T) => Promise<R>,
): Promise<R[]> => {
	const out: R[] = [];
	await eachInOrder(items, async (item) => {
		out.push(await fn(item));
	});
	return out;
};
