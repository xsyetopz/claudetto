// A `CLAUDE.md` of a chosen size, so a reading shows what a memory file costs in the request.

const LINE = "Keep each change small and run the tests before you finish.\n";

/** Exactly `chars` characters of short lines that end in a newline; `0` gives an empty file. */
export const claudeMdOf = (chars: number): string => {
	if (chars <= 0) {
		return "";
	}
	const lines = LINE.repeat(Math.ceil(chars / LINE.length)).slice(0, chars);
	return `${lines.slice(0, -1)}\n`;
};
