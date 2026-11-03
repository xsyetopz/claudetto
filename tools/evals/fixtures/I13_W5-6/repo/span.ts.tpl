import { parseRange } from "./parse.ts";

/** How many numbers a range text covers. */
export const spanLength = (text: string): number =>
	parseRange(text).length + 1;
