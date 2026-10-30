// Reading the reply of a check: a declined line, a refused reply, or one line to offer with its tag
// and the explanation that came in the same reply. The label patterns are those of
// `docs/keep/plugins/you-should-know-design.txt:40` and `:70`, and the line rules of `:120`.

import { BORROWED } from "./constants.ts";

/** The read of a check reply: `none` when the model declined, `refused` when the reply broke the form, else the `offer` with its line, tag, and explanation. */
export type Reply =
	| { readonly kind: "none" }
	| { readonly kind: "refused" }
	| {
			readonly kind: "offer";
			readonly line: string;
			readonly tag: string;
			readonly explanation: string;
	  };

// The labels of the reply form this plugin's own prompt asks for. They are written here in the
// plugin's own pattern, and not copied from the original's.
const LEARN_LABEL = /^learn[ \t]*:[ \t]*/i;
const EXPLAIN_LABEL = /^explain[ \t]*:[ \t]*/i;
const TAG_LABEL = /^\W*tag\s*[:\-–—]\s*(.*)$/i;
const HEADS_UP = /^\W*heads(?:\s|-)*up\W*$/i;
const DECLINED = /^none\.?$/i;
const ENDS_A_SENTENCE = /[.!?]$/;

/** Opening and closing marks of a pair that wraps a line, which the reader takes off. */
const WRAPPING_QUOTES: readonly (readonly [string, string])[] = [
	['"', '"'],
	["'", "'"],
	["“", "”"],
	["‘", "’"],
	["`", "`"],
];

const unquoted = (text: string): string => {
	const pair = WRAPPING_QUOTES.find(
		([open, close]) =>
			text.length > 1 && text.startsWith(open) && text.endsWith(close),
	);
	return pair === undefined ? text : text.slice(1, -1).trim();
};

const tagOf = (lines: readonly string[]): string => {
	const found = lines
		.map((line) => TAG_LABEL.exec(line.trim())?.[1])
		.find((value) => value !== undefined);
	return found !== undefined && HEADS_UP.test(found)
		? "Heads up"
		: BORROWED.DEFAULT_TAG;
};

const explanationOf = (lines: readonly string[]): string => {
	const at = lines.findIndex((line) => EXPLAIN_LABEL.test(line.trim()));
	if (at === -1) {
		return "";
	}
	const first = (lines[at] ?? "").trim().replace(EXPLAIN_LABEL, "");
	return [first, ...lines.slice(at + 1)].join("\n").trim();
};

/** Reads the reply of a check. A reply with no `learn:` label, or an empty or overlong line, is refused. */
export const parseReply = (text: string): Reply => {
	const lines = text.split("\n");
	const head = lines.find((line) => LEARN_LABEL.test(line.trim()));
	if (head === undefined) {
		return { kind: "refused" };
	}
	const said = unquoted(head.trim().replace(LEARN_LABEL, "").trim());
	if (DECLINED.test(said)) {
		return { kind: "none" };
	}
	if (said === "" || said.length > BORROWED.MAX_LINE_WIDTH) {
		return { kind: "refused" };
	}
	return {
		kind: "offer",
		line: ENDS_A_SENTENCE.test(said) ? said : `${said}.`,
		tag: tagOf(lines),
		explanation: explanationOf(lines),
	};
};
