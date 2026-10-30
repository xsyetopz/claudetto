/** A sink that a `main` writes to and a test reads back whole. */
export const output = (): {
	write: (s: string) => void;
	text: () => string;
} => {
	const chunks: string[] = [];
	return { write: (s) => chunks.push(s), text: () => chunks.join("") };
};

/** Prints each fault on stderr and fails the process when there is one. */
export const reportFaults = (faults: readonly string[]): void => {
	for (const line of faults) {
		console.error(line);
	}
	if (faults.length > 0) {
		process.exitCode = 1;
	}
};
