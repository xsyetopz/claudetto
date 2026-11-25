/** Runs the steps one after another, since each call leaves state the next one reads. */
export const inOrder = async <T, R>(
	items: readonly T[],
	step: (item: T) => Promise<R>
): Promise<R[]> => {
	// The generator starts a step only when the consumer asks for the next result.
	async function* lazily(): AsyncGenerator<R> {
		for (const item of items) {
			yield step(item);
		}
	}
	const results: R[] = [];
	for await (const result of lazily()) {
		results.push(result);
	}
	return results;
};
