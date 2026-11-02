const FAILURE = /fail|error|✗|panic|traceback/i;

const HEAD_SHARE = 0.4;

const TAIL_SHARE = 0.4;

/** What is left of the bound after head and tail, so the kept failure lines never lift the text far past it. */
const FAILURE_SHARE = 0.2;

const FAILURE_LINE_CHARS = 300;

const failureLines = (middle: string, budget: number): string[] => {
	const kept: string[] = [];
	let used = 0;
	for (const line of middle.split("\n")) {
		const text = line.trim().slice(0, FAILURE_LINE_CHARS);
		if (text !== "" && FAILURE.test(text) && used + text.length <= budget) {
			kept.push(text);
			used += text.length + 1;
		}
	}
	return kept;
};

const markerOf = (cut: number, saved: string | undefined): string =>
	saved === undefined
		? `[claudetto: cut ${cut} characters; the full output could not be saved]`
		: `[claudetto: cut ${cut} characters; the full output is in \`${saved}\`]`;

/**
 * Keeps the head and the tail of `text` and the failure lines of what lies between, so a summary at
 * the end and a failure in the middle both reach the model. Text within `limit` is returned as it is.
 */
export const boundText = (
	text: string,
	limit: number,
	saved: string | undefined,
): string => {
	if (limit <= 0 || text.length <= limit) {
		return text;
	}
	const headLength = Math.floor(limit * HEAD_SHARE);
	const tailLength = Math.floor(limit * TAIL_SHARE);
	const middle = text.slice(headLength, text.length - tailLength);
	const kept = failureLines(middle, Math.floor(limit * FAILURE_SHARE));
	return [
		text.slice(0, headLength),
		...kept,
		markerOf(middle.length, saved),
		text.slice(text.length - tailLength),
	].join("\n");
};
