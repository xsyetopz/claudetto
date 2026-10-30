import { BORROWED } from "./constants.ts";

const FINAL_PERIOD = /\.$/;

export const lineKey = (line: string): string =>
	line.trim().toLowerCase().replace(FINAL_PERIOD, "");

export const isRepeat = (
	line: string,
	lists: readonly (readonly string[])[],
): boolean => {
	const key = lineKey(line);
	return lists.some((list) => list.some((other) => lineKey(other) === key));
};

export const remember = (
	list: readonly string[],
	line: string,
): readonly string[] => {
	const key = lineKey(line);
	return [...list.filter((other) => lineKey(other) !== key), line].slice(
		-BORROWED.SEEN_MAX,
	);
};
