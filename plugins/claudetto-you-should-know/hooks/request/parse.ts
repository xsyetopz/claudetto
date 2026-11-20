/** Parses the side request's reply: `learn:`, `tag:` and `explain:` lines. */

import { DEFAULT_TAG, MAX_LINE_WIDTH } from "../shared/constants";
import { cleanOneLine, stripControlSequences } from "../text/text";

export type Tag = "You should know" | "Heads up";

export type Proposed =
	| { readonly kind: "none" }
	| { readonly kind: "unparsable" }
	| {
			readonly kind: "line";
			readonly line: string;
			readonly tag: Tag;
			readonly explanation: string | undefined;
	  };

export const LEARN_LABEL = /^learn\s*:\s*/iu;
export const EXPLAIN_LABEL = /^explain:\s*/iu;
export const HEADS_UP = /^\W*heads[\s-]*up\W*$/iu;
export const TAG_LABEL =
	/^[\s>*_"'“”‘’`]*tag[\s*_"'“”‘’`]*(?::\s*|[-–—](?:\s+|$))/iu;
export const INLINE_TAG =
	/[.\s—–-]*\s\**tag\**\s*:\s*\**\s*(heads[\s-]*up|you should know)\W*$/iu;

export const WRAPPING_QUOTES: readonly (readonly [string, string])[] = [
	['"', '"'],
	["'", "'"],
	["“", "”"],
	["‘", "’"],
	["`", "`"]
];
export const CLOSERS = WRAPPING_QUOTES.map(([, close]) => close).join("");
export const ENDS_A_SENTENCE = new RegExp(`[.!?…][${CLOSERS})\\]]*$`, "u");
export const ENDS_WITH_QUESTION = new RegExp(`\\?[${CLOSERS}]?$`, "u");

export const isDeclined = (answer: string): boolean =>
	answer === "" || /^none\s*(?:[.!?()[\]:;,-]|$)/iu.test(answer);

export const withoutTrailingPeriod = (text: string): string =>
	text.replace(/\.+$/u, "");

export function unquoted(text: string): string {
	const bare = withoutTrailingPeriod(text.trim());
	if (
		bare.length >= 2 &&
		WRAPPING_QUOTES.some(
			([open, close]) =>
				bare.startsWith(open) &&
				bare.endsWith(close) &&
				!bare.slice(1, -1).includes(close)
		)
	) {
		return withoutTrailingPeriod(bare.slice(1, -1).trim());
	}
	return bare;
}

export const openingOf = (text: string): string =>
	unquoted(unquoted(text).replace(INLINE_TAG, ""));

export const tagOf = (label: string): Tag =>
	HEADS_UP.test(label) ? "Heads up" : DEFAULT_TAG;

const BULLET = /^[-*•]\s+/u;

interface Explained {
	readonly hasExplain: boolean;
	readonly explainAt: number;
	readonly explanation: string | undefined;
}

/** Finds the `explain:` line after the `learn:` line and the text that follows it. */
function explainedIn(
	raw: readonly string[],
	trimmed: readonly string[]
): Explained {
	const learnAt = trimmed.findIndex((line) =>
		LEARN_LABEL.test(line.replace(BULLET, ""))
	);
	const explainAfter = trimmed
		.slice(learnAt + 1)
		.findIndex((line) => EXPLAIN_LABEL.test(line));
	const hasExplain = learnAt !== -1 && explainAfter !== -1;
	const explainAt = hasExplain ? learnAt + 1 + explainAfter : -1;
	const body = [
		(trimmed[explainAt] ?? "").replace(EXPLAIN_LABEL, ""),
		...raw.slice(explainAt + 1)
	]
		.join("\n")
		.trim();
	return {
		hasExplain,
		explainAt,
		explanation: hasExplain ? body || undefined : undefined
	};
}

/** The `learn:` text, continued over the lines that follow it until a blank, a label or a question. */
function learnedFrom(
	lines: readonly string[],
	index: number,
	line: string
): string {
	let learn = line.replace(LEARN_LABEL, "").trim();
	for (const next of lines.slice(index + 1)) {
		if (
			next === "" ||
			LEARN_LABEL.test(next) ||
			TAG_LABEL.test(next) ||
			ENDS_WITH_QUESTION.test(learn)
		) {
			break;
		}
		learn += ` ${next}`;
	}
	return learn;
}

export function parseProposedLine(reply: string): Proposed {
	const raw = reply.split("\n");
	const trimmed = raw.map((line) => stripControlSequences(line).trimStart());
	const { hasExplain, explainAt, explanation } = explainedIn(raw, trimmed);
	const lines = (hasExplain ? raw.slice(0, explainAt) : raw).map((line) =>
		cleanOneLine(stripControlSequences(line)).replace(BULLET, "")
	);
	const tagLine = lines.find((line) => TAG_LABEL.test(line)) ?? "";
	const labelTag = tagOf(tagLine.replace(TAG_LABEL, ""));
	for (const [index, line] of lines.entries()) {
		if (!LEARN_LABEL.test(line)) {
			continue;
		}
		if (isDeclined(openingOf(line.replace(LEARN_LABEL, "").trim()))) {
			return { kind: "none" };
		}
		const whole = unquoted(learnedFrom(lines, index, line));
		const inline = INLINE_TAG.exec(whole);
		const opening =
			inline === null ? whole : unquoted(whole.slice(0, inline.index));
		const sentence = ENDS_A_SENTENCE.test(opening) ? opening : `${opening}.`;
		const tag =
			tagLine === "" && inline !== null ? tagOf(inline[1] ?? "") : labelTag;
		if (sentence.length <= MAX_LINE_WIDTH) {
			return { kind: "line", line: sentence, tag, explanation };
		}
	}
	return { kind: "unparsable" };
}

export const lineKey = (line: string): string =>
	line.toLowerCase().replace(/\.$/u, "");

/** Adds `line` to the kept list unless it is there in any case; keeps the newest `max`. */
export function withKnown(
	known: readonly string[],
	line: string,
	max: number
): readonly string[] | undefined {
	if (known.some((entry) => entry.toLowerCase() === line.toLowerCase())) {
		return undefined;
	}
	return [...known, line].slice(-max);
}
