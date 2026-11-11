import {
	type Host,
	ledgerQuestions,
	RULE_CRITERIA,
} from "./decider/questions.ts";
import { settle } from "./decider/settle.ts";
import type { PinConstraint } from "./texts-handoff.ts";

const SEGMENTER = new Intl.Segmenter("en", { granularity: "sentence" });
// The most sentences of one message a request asks about. A request often follows the material it is about, so a longer message keeps its head and its tail.
const SENTENCE_CAP = 41;
const HEAD = 20;
// A word that ends in a file extension. An abbreviation such as "e.g." and a version such as "1.2" are none.
const FILE = /[\w@~./-]*[\w/-][\w-]\.[a-z]\w*/giu;

/** The sentences of a message, each without the space around it. */
export const sentencesOf = (message: string): string[] =>
	[...SEGMENTER.segment(message)]
		.map((part) => part.segment.trim())
		.filter((sentence) => sentence !== "");

function capped($: Host, sentences: string[]): string[] {
	if (sentences.length <= SENTENCE_CAP) {
		return sentences;
	}
	$.ui.log(
		`A message holds ${sentences.length} sentences, and the ledger reads the first ${HEAD} and the last ${SENTENCE_CAP - HEAD}.`,
	);
	return [...sentences.slice(0, HEAD), ...sentences.slice(HEAD - SENTENCE_CAP)];
}

const numbered = (items: readonly string[]): string =>
	items.map((item, i) => `${i + 1}. ${item}`).join("\n");

const among = <Option extends string>(
	options: Readonly<Record<Option, string>>,
	answer: string | undefined,
): answer is Option => answer !== undefined && Object.hasOwn(options, answer);

const entryOf = (text: string, rule: string | undefined): PinConstraint => {
	const files = rule === "only-files" ? (text.match(FILE) ?? []) : [];
	if (files.length > 0) {
		return { text, rule: "only-files", files: [...files] };
	}
	return {
		text,
		rule: among(RULE_CRITERIA, rule) && rule !== "only-files" ? rule : "none",
	};
};

/**
 * Asks the Decider, in one call, which sentences of `message` and of the `earlier` messages limit the assistant, and which of the `previous` entries `message` lifts, and returns the entries that stand after it.
 * An entry is a sentence the person wrote. An answer that is not settled adds no entry and lifts none, so a Decider that fails keeps `previous`.
 */
export async function readLedger(
	$: Host,
	earlier: readonly string[],
	message: string,
	previous: readonly PinConstraint[],
): Promise<PinConstraint[]> {
	const sentences = [...earlier, message].flatMap((text) =>
		capped($, sentencesOf(text)),
	);
	const answers = await settle(
		$,
		ledgerQuestions(sentences.length, previous.length),
		{
			message,
			sentences: numbered(sentences),
			...(previous.length === 0
				? {}
				: { entries: numbered(previous.map((p) => p.text)) }),
		},
	);
	const kept = previous.filter((_, j) => answers[`lifts_${j + 1}`] !== "yes");
	const found = sentences.flatMap((text, i) =>
		answers[`restricts_${i + 1}`] === "yes"
			? [entryOf(text, answers[`rule_${i + 1}`])]
			: [],
	);
	return [...new Map([...kept, ...found].map((c) => [c.text, c])).values()];
}
