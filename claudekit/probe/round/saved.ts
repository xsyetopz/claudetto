// The forks a round saved to `results.jsonl`, read back so that a round which already paid can be
// reported again for free. A round that stops at its cost cap, or that is killed, leaves the file whole
// and the report missing, and the forks in it are measured and paid for either way.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { ARMS, type Result } from "./result.ts";

/** The name a round saves its forks under, one JSON object to a line, appended as each fork ends. */
export const RESULTS_FILE = "results.jsonl";

/** The number fields that every fork has, whatever happened inside it, and a half-written line lacks. */
const NUMBERS = [
	"size",
	"run",
	"cost",
	"turns",
	"compactions",
	"peak",
	"broken",
	"untested",
	"skipped",
	"rereads",
	"redone",
	"next",
] as const;

/**
 * The measures that only a fork which compacted has. Each may be absent or `null` in a saved line, for
 * two reasons, and requiring either would drop whole forks and move the mean of their arm.
 * `JSON.stringify` writes a NaN as `null`, so a fork that did not compact carries `null` here. And a
 * round that paid before a measure existed has no such key at all.
 */
const AFTER = ["firstWrite", "firstPre", "firstPost"] as const;

const isNumber = (row: object, key: string): boolean =>
	key in row && typeof Reflect.get(row, key) === "number";

const isNumberOrUnknown = (row: object, key: string): boolean => {
	const value = Reflect.get(row, key);
	return value === undefined || value === null || typeof value === "number";
};

const orNaN = (value: unknown): number =>
	typeof value === "number" ? value : Number.NaN;

/** `row` with each after-compaction measure as a number, where an absent or null one is NaN: unknown. */
const read = (row: Result): Result => ({
	...row,
	firstWrite: orNaN(row.firstWrite),
	firstPre: orNaN(row.firstPre),
	firstPost: orNaN(row.firstPost),
});

/**
 * Whether `row` carries every field a report reads. The last line of a file whose writer was killed
 * mid-append is a fragment, and a fragment counted as a fork would move a mean.
 */
const isResult = (row: unknown): row is Result => {
	if (typeof row !== "object" || row === null) {
		return false;
	}
	const arm = Reflect.get(row, "arm");
	const invalid = Reflect.get(row, "invalid");
	return (
		ARMS.some((a) => a === arm) &&
		Array.isArray(Reflect.get(row, "shares")) &&
		(invalid === null || typeof invalid === "string") &&
		NUMBERS.every((key) => isNumber(row, key)) &&
		AFTER.every((key) => isNumberOrUnknown(row, key))
	);
};

const parsed = (line: string): unknown => {
	try {
		return JSON.parse(line);
	} catch {
		return null;
	}
};

/** The forks of `text`, in the order they were saved, with each line that is not a whole fork dropped. */
export const resultsOf = (text: string): Result[] =>
	text
		.split("\n")
		.filter((line) => line.trim() !== "")
		.map(parsed)
		.filter(isResult)
		.map(read);

/** The forks that the round under `dir` saved. */
export const savedResults = async (dir: string): Promise<Result[]> =>
	resultsOf(await readFile(path.join(dir, RESULTS_FILE), "utf8"));
