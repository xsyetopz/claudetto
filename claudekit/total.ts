/** The sum of `numbers`, as a loop because the lint refuses a `reduce`. */
export const total = (numbers: readonly number[]): number => {
	let sum = 0;
	for (const n of numbers) {
		sum += n;
	}
	return sum;
};
