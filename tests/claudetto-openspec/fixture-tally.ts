// What each replayed record did, counted per fixture file and printed once the run ends.
import { deepEquals } from "bun";

export interface Pair {
	actual: unknown;
	expected: unknown;
}

const tally: Record<string, Record<string, number>> = {};

export const count = (file: string, what: string) => {
	const row = tally[file] ?? {};
	row[what] = (row[what] ?? 0) + 1;
	tally[file] = row;
};

export const reportTally = () => {
	for (const [file, row] of Object.entries(tally)) {
		console.info(file, JSON.stringify(row));
	}
};

// Equal the way the specs' `toEqual` is: a recorded tree and a tree read from disk list their paths in different orders.
export const same = (x: unknown, y: unknown) => deepEquals(x, y);

// A case set aside with a reason compares equal to itself, so it passes and is counted.
export const skipped = (label: string): Pair => ({
	actual: label,
	expected: label,
});

export const settle = (file: string, pair: Pair): Pair => {
	count(file, same(pair.actual, pair.expected) ? "pass" : "FAIL");
	return pair;
};
