// It ships in no hook: `docs/evidence/reply-openings.md` reads it at 89% false positives on this
// login's replies. It lives in `claudekit/` and not in `tools/` for that reason: `tools/` holds the
// checks `just check` runs, and this is a probe that measures real sessions and that no gate runs. It
// stays because the page names `bun claudekit/openings/reply.ts` as the command that retakes the
// reading, so another corpus can overturn the base rate.
//
// The signal is structural because a word list is prose policing, and a word list fired on correct work, while a judge is a model call per reply: `work.reply-opening` spent a
// `claude-haiku-5-5` call on every reply of every session.

/** A code span, as Markdown writes one. */
const CODE_SPAN = /`[^`]+`/;

/** A digit, which is how a count, a score, or a version arrives. */
const DIGIT = /\d/;

/** A sentence end: `.`, `!`, or `?` before a space or the end of the text. */
const SENTENCE_END = /[.!?](\s|$)/;

/** A heading, list, or quote marker at the start of a line, which is shape and not sentence. */
const LINE_MARKER = /^(?:[#>]+|[-*+]|\d+\.)\s*/;

/** The first line of a text that holds something other than spaces. */
const firstLine = (text: string): string => {
	for (const line of text.split("\n")) {
		const trimmed = line.trim();
		if (trimmed !== "") {
			return trimmed;
		}
	}
	return "";
};

/**
 * The first sentence of a reply, or the whole first line when it holds no sentence end. A heading
 * marker, a list marker, and a quote marker are dropped, because they are the shape of the line and
 * not of the sentence.
 */
export const firstSentence = (answer: string): string => {
	const line = firstLine(answer).replace(LINE_MARKER, "");
	const end = SENTENCE_END.exec(line);
	return end?.index === undefined ? line : line.slice(0, end.index + 1).trim();
};

/**
 * Whether the sentence carries evidence: a code span or a digit. Nothing here reads a word, so a
 * reply cannot pass by using an approved phrase and cannot fail by using a plain one.
 */
export const hasEvidence = (sentence: string): boolean =>
	CODE_SPAN.test(sentence) || DIGIT.test(sentence);
