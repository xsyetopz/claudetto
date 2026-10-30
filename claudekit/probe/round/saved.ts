import { readFile } from "node:fs/promises";
import path from "node:path";
import { parsed } from "../../session/result.ts";
import { ARMS, type Result } from "./result.ts";

export const RESULTS_FILE = "results.jsonl";

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

const AFTER = ["firstWrite", "firstPre", "firstPost"] as const;

const isNumber = (row: object, key: string): boolean =>
	key in row && typeof Reflect.get(row, key) === "number";

const isNumberOrUnknown = (row: object, key: string): boolean => {
	const value = Reflect.get(row, key);
	return value === undefined || value === null || typeof value === "number";
};

const orNaN = (value: unknown): number =>
	typeof value === "number" ? value : Number.NaN;

const read = (row: Result): Result => ({
	...row,
	firstWrite: orNaN(row.firstWrite),
	firstPre: orNaN(row.firstPre),
	firstPost: orNaN(row.firstPost),
});

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

export const resultsOf = (text: string): Result[] =>
	text
		.split("\n")
		.filter((line) => line.trim() !== "")
		.map(parsed)
		.filter(isResult)
		.map(read);

export const savedResults = async (dir: string): Promise<Result[]> =>
	resultsOf(await readFile(path.join(dir, RESULTS_FILE), "utf8"));
