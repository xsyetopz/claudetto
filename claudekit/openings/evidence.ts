const CODE_SPAN = /`[^`]+`/;

const DIGIT = /\d/;

const SENTENCE_END = /[.!?](\s|$)/;

const LINE_MARKER = /^(?:[#>]+|[-*+]|\d+\.)\s*/;

const firstLine = (text: string): string => {
	for (const line of text.split("\n")) {
		const trimmed = line.trim();
		if (trimmed !== "") {
			return trimmed;
		}
	}
	return "";
};

/** Drops heading, list, and quote markers, because they are line shape and not sentence. */
export const firstSentence = (answer: string): string => {
	const line = firstLine(answer).replace(LINE_MARKER, "");
	const end = SENTENCE_END.exec(line);
	return end?.index === undefined ? line : line.slice(0, end.index + 1).trim();
};

/** Reads no word, so a reply cannot pass by an approved phrase or fail by a plain one. */
export const hasEvidence = (sentence: string): boolean =>
	CODE_SPAN.test(sentence) || DIGIT.test(sentence);
