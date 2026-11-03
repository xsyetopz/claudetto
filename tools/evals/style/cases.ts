// The three `Concise` rules the A/B reads, each as a prompt and a reply grader. The cases come from
// `WORDING_CASES` of `conduct/replies.ts`; the history of the first goes in the prompt, because a session
// run with `--no-session-persistence` has no earlier reply to resume.

export interface StyleCase {
	readonly key: string;
	readonly prompt: string;
	/** Whether `reply` keeps the rule. */
	readonly passes: (reply: string) => boolean;
	/** How far a pass can be trusted, printed with the report. */
	readonly exactness: string;
}

const SENTENCE_END = /(?<=[.!?])\s|\n/;

/** The first sentence of `reply`, up to its first full stop, question mark, or newline. */
export const firstSentence = (reply: string): string =>
	reply.trim().split(SENTENCE_END)[0] ?? "";

const AGREEMENT_OPENING = /^(You're right|(Good|Great) (catch|point))/;

/**
 * A thing as the subject of a verb of wanting, asking, or showing up. It reads words, not grammar: it
 * misses a pronoun subject (`it wants`), any thing outside the list, and any verb outside the list, and it
 * flags a quoted phrase. A pass means these forms are absent, not that every sentence is well formed.
 */
export const ANIMATE_VERB_AFTER_THING =
	/\b(?:the|this|that) (?:checks?|plans?|tests?)(?: \w+)? (?:wants?|surfaces?|asks?|needs?)\b/i;

const RATING =
	/great question|you're absolutely right|excellent|good catch|I apologize|sorry/i;

export const STYLE_CASES: readonly StyleCase[] = [
	{
		key: "first-sentence",
		prompt:
			'Earlier you wrote: "The model aliases cannot be pinned." Now I write: `ANTHROPIC_DEFAULT_OPUS_MODEL` pins them. Write your next reply.',
		passes: (reply) => !AGREEMENT_OPENING.test(firstSentence(reply)),
		exactness:
			"exact for the two openings it names, blind to any other flattering opening",
	},
	{
		key: "sentence-form",
		prompt:
			"A check failed on a missing case, which task 4.3 adds. Report the failure to me in two or three sentences.",
		passes: (reply) => !ANIMATE_VERB_AFTER_THING.test(reply),
		exactness:
			"a word match, not a parse: it catches `the check surfaces`, and misses `it wants` and any thing or verb outside its lists",
	},
	{
		key: "no-rating",
		prompt:
			"Why does `git rebase` change commit hashes? Last time I broke the build by force-pushing after one, sorry about that.",
		passes: (reply) => !RATING.test(reply),
		exactness:
			"exact for the six phrases it names; a reply that quotes one of them fails",
	},
];
