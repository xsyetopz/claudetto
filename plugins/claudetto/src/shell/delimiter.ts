// The heredoc delimiter after `<<` or `<<-`, for `scan.ts`.

const ENDS = /[\s;&|<>()]/;

/** The text of the part at `text[i]`, true when it is quoted, and the index of its last character. */
const partAt = (text: string, i: number) => {
	const c = text.charAt(i);
	if (c === "\\" && i + 1 < text.length) {
		return { text: text.charAt(i + 1), quoted: true, last: i + 1 };
	}
	if (c === "'" || c === '"') {
		const close = text.indexOf(c, i + 1);
		const stop = close < 0 ? text.length : close;
		return { text: text.slice(i + 1, stop), quoted: true, last: stop };
	}
	return { text: c, quoted: false, last: i };
};

/**
 * The delimiter word that starts at `text[at]`, after blanks: its text with quotes and backslashes removed,
 * true when a part of it is quoted (`E"OF"`, `\EOF`), and the index after it.
 * The shell does not expand the body of a heredoc with a quoted delimiter.
 * Null when no word is there.
 */
export const delimiterAt = (
	text: string,
	at: number,
): { word: string; quoted: boolean; end: number } | null => {
	let i = at;
	while (text[i] === " " || text[i] === "\t") {
		i++;
	}
	let word = "";
	let quoted = false;
	for (; i < text.length && !ENDS.test(text.charAt(i)); i++) {
		const part = partAt(text, i);
		word += part.text;
		quoted ||= part.quoted;
		i = part.last;
	}
	return word || quoted ? { word, quoted, end: i } : null;
};
