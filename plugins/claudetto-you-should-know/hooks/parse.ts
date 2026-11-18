/** Parses the side request's reply: `learn:`, `tag:` and `explain:` lines. */

import { DEFAULT_TAG, MAX_LINE_WIDTH } from "./constants";
import { cleanOneLine, stripControlSequences } from "./text";

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

export const LEARN_LABEL = /^learn\s*:\s*/i;
export const EXPLAIN_LABEL = /^explain:\s*/i;
export const HEADS_UP = /^\W*heads[\s-]*up\W*$/i;
export const TAG_LABEL =
	/^[\s>*_"'“”‘’`]*tag[\s*_"'“”‘’`]*(?::\s*|[-–—](?:\s+|$))/i;
export const INLINE_TAG =
	/[.\s—–-]*\s\**tag\**\s*:\s*\**\s*(heads[\s-]*up|you should know)\W*$/i;

export const WRAPPING_QUOTES: readonly (readonly [string, string])[] = [
	['"', '"'],
	["'", "'"],
	["“", "”"],
	["‘", "’"],
	["`", "`"],
];
export const CLOSERS = WRAPPING_QUOTES.map(([, close]) => close).join("");
export const ENDS_A_SENTENCE = new RegExp(`[.!?…][${CLOSERS})\\]]*$`);
export const ENDS_WITH_QUESTION = new RegExp(`\\?[${CLOSERS}]?$`);

export const isDeclined = (answer: string): boolean =>
	answer === "" || /^none\s*(?:[.!?()[\]:;,-]|$)/i.test(answer);

export const withoutTrailingPeriod = (text: string): string =>
	text.replace(/\.+$/, "");

export function unquoted(text: string): string {
	const bare = withoutTrailingPeriod(text.trim());
	if (
		bare.length >= 2 &&
		WRAPPING_QUOTES.some(
			([open, close]) =>
				bare.startsWith(open) &&
				bare.endsWith(close) &&
				!bare.slice(1, -1).includes(close),
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

const BULLET = /^[-*•]\s+/;

export function parseProposedLine(reply: string): Proposed {
	const raw = reply.split("\n");
	const trimmed = raw.map((line) => stripControlSequences(line).trimStart());
	const learnAt = trimmed.findIndex((line) =>
		LEARN_LABEL.test(line.replace(BULLET, "")),
	);
	const explainAfter = trimmed
		.slice(learnAt + 1)
		.findIndex((line) => EXPLAIN_LABEL.test(line));
	const hasExplain = learnAt !== -1 && explainAfter !== -1;
	const explainAt = hasExplain ? learnAt + 1 + explainAfter : -1;
	const body = [
		(trimmed[explainAt] ?? "").replace(EXPLAIN_LABEL, ""),
		...raw.slice(explainAt + 1),
	]
		.join("\n")
		.trim();
	const explanation = hasExplain ? body || undefined : undefined;
	const lines = (hasExplain ? raw.slice(0, explainAt) : raw).map((line) =>
		cleanOneLine(stripControlSequences(line)).replace(BULLET, ""),
	);
	const tagLine = lines.find((line) => TAG_LABEL.test(line)) ?? "";
	const labelTag = tagOf(tagLine.replace(TAG_LABEL, ""));
	for (const [index, line] of lines.entries()) {
		if (!LEARN_LABEL.test(line)) {
			continue;
		}
		let learn = line.replace(LEARN_LABEL, "").trim();
		if (isDeclined(openingOf(learn))) {
			return { kind: "none" };
		}
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
		const whole = unquoted(learn);
		const inline = INLINE_TAG.exec(whole);
		const opening = inline === null ? whole : unquoted(whole.slice(0, inline.index));
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
	line.toLowerCase().replace(/\.$/, "");

/** Adds `line` to the kept list unless it is there in any case; keeps the newest `max`. */
export function withKnown(
	known: readonly string[],
	line: string,
	max: number,
): readonly string[] | undefined {
	if (known.some((entry) => entry.toLowerCase() === line.toLowerCase())) {
		return undefined;
	}
	return [...known, line].slice(-max);
}
