// Comparing offered lines with the lists of lines already shown or already known.

import { BORROWED } from "./constants.ts";

const FINAL_PERIOD = /\.$/;

/** A line as it is compared: trimmed, lowercase, and without a final period. */
export const lineKey = (line: string): string =>
	line.trim().toLowerCase().replace(FINAL_PERIOD, "");

/** Whether the line is on any of the lists, whatever its case and final period. */
export const isRepeat = (
	line: string,
	lists: readonly (readonly string[])[],
): boolean => {
	const key = lineKey(line);
	return lists.some((list) => list.some((other) => lineKey(other) === key));
};

/** The list with the line last and only once, trimmed to the most lines kept. */
export const remember = (
	list: readonly string[],
	line: string,
): readonly string[] => {
	const key = lineKey(line);
	return [...list.filter((other) => lineKey(other) !== key), line].slice(
		-BORROWED.SEEN_MAX,
	);
};
