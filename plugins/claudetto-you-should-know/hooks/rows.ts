/** The rows drawn above the prompt for each view kind, built over the element table. */

import type { Card } from "./cards";
import { DEFAULT_TAG, OFFER_LABELS, STAR_CELLS } from "./constants";
import { CHOICE_GAP } from "./text";
import {
	ABOUT_CLOSED,
	type About,
	aboutCard,
	aboutFit,
	type Choice,
	type Copy,
	noteSpans,
} from "./copy";
import { proseMarkdown } from "./markdown";
import { type Check, checkLineOf } from "./checks";
import { leadInkOf, type Table } from "./table";

type Node = unknown;
const el = (tag: unknown, props: Record<string, unknown> | null, ...kids: unknown[]): Node =>
	h(tag as never, props, ...kids);

/** One hotkeyed choice. */
export function choice(table: Table, c: Choice): Node {
	const { Box, Button } = table;
	return el(
		Box,
		{ marginRight: CHOICE_GAP },
		el(
			Button,
			{ hotkey: c.hotkey, plain: true, dimColor: c.isDim, role: c.role, onPress: c.onPress },
			c.label,
		),
	);
}

export function choicesRow(table: Table, choices: readonly Choice[]): Node {
	return el(
		table.Box,
		{ marginLeft: 2, flexWrap: "wrap" },
		choices.map((c) => choice(table, c)),
	);
}

/** The star and, when given, the tag, ahead of a line. */
export function lead(table: Table, tag?: string): Node {
	const ink = leadInkOf(table);
	const { Text } = table;
	return el(
		Text,
		null,
		el(Text, { ...ink.star }, "✦"),
		tag === undefined ? " " : el(Text, { ...ink.tag }, " ", tag, " · "),
	);
}

export function starColumn(table: Table, body: Node): Node {
	const { Box, Text } = table;
	return el(
		Box,
		{ flexDirection: "row", alignItems: "flex-start" },
		el(
			Box,
			{ flexShrink: 0, width: STAR_CELLS },
			el(Text, { ...leadInkOf(table).star }, "✦"),
		),
		body,
	);
}

export function starred(table: Table, tag: string | undefined, body: unknown): Node {
	const { Text } = table;
	const ink = leadInkOf(table);
	if (table.hasStarColumn ?? true) {
		return starColumn(
			table,
			el(
				Text,
				{ wrap: "wrap" },
				tag === undefined ? "" : el(Text, { ...ink.tag }, tag, " · "),
				body,
			),
		);
	}
	return el(Text, { wrap: "wrap" }, lead(table, tag), body);
}

export type DismissHandlers = {
	readonly helpful?: (() => void) | undefined;
	readonly notRelevant?: (() => void) | undefined;
	readonly notUnderstood?: (() => void) | undefined;
	readonly off?: (() => void) | undefined;
	readonly dismiss: () => void;
};

export function dismissedLine(
	table: Table,
	choices: readonly Choice[],
	dismiss: (() => void) | undefined,
): Node {
	const { Box, Text } = table;
	const hasStar = table.hasStarColumn ?? true;
	const all = [
		...choices,
		{ hotkey: "0", label: "Dismiss", onPress: dismiss, role: "dismiss" },
	].map((c) => choice(table, c));
	if (hasStar) {
		return el(
			Box,
			{ flexDirection: "column", marginTop: 1 },
			starColumn(
				table,
				el(
					Box,
					{ flexWrap: "wrap" },
					el(
						Box,
						{ marginRight: CHOICE_GAP },
						el(Text, { dimColor: true, wrap: "truncate-end" }, "Dismissed."),
					),
					all,
				),
			),
		);
	}
	return el(
		Box,
		{ marginTop: 1, flexWrap: "wrap" },
		el(
			Box,
			{ marginRight: CHOICE_GAP },
			el(
				Text,
				{ wrap: "truncate-end" },
				lead(table),
				el(Text, { dimColor: true }, "Dismissed."),
			),
		),
		all,
	);
}

export function askedRow(table: Table, on: DismissHandlers): Node {
	const off: Choice[] =
		on.off !== undefined
			? [{ hotkey: "4", label: "Turn off suggestions", onPress: on.off }]
			: [];
	return dismissedLine(
		table,
		[
			{ hotkey: "1", label: "That was helpful", onPress: on.helpful },
			{ hotkey: "2", label: "Not relevant", onPress: on.notRelevant },
			{ hotkey: "3", label: "Couldn’t understand", onPress: on.notUnderstood },
			...off,
		],
		on.dismiss,
	);
}

export const explainedAskedRow = (table: Table, on: DismissHandlers): Node =>
	dismissedLine(
		table,
		[
			{ hotkey: "1", label: "That was helpful", onPress: on.helpful },
			{ hotkey: "2", label: "Didn’t understand", onPress: on.notUnderstood },
		],
		on.dismiss,
	);

export function debugRows(
	table: Table,
	checks: readonly Check[],
	below?: Node,
): Node {
	const { Box, Text } = table;
	return el(
		Box,
		{ flexDirection: "column" },
		el(
			Box,
			{ flexDirection: "column", marginTop: 1 },
			checks.map((check) =>
				el(
					Box,
					null,
					el(Text, { ...leadInkOf(table).star }, "✦"),
					el(Text, { wrap: "truncate-end", dimColor: true }, " ", checkLineOf(check)),
				),
			),
		),
		below ?? "",
	);
}

function prose(table: Table, text: string, title: string): Node {
	const markdown = proseMarkdown(text, title);
	if (markdown === "") {
		return "";
	}
	return el(table.Markdown, { text: markdown });
}

export type ExplainedHandlers = {
	readonly gotIt?: (() => void) | undefined;
	readonly respond?: (() => void) | undefined;
	readonly dismiss?: (() => void) | undefined;
};

export function explainedRow(
	table: Table,
	line: string,
	cards: readonly Card[],
	on: ExplainedHandlers | null,
	tag: string = DEFAULT_TAG,
): Node {
	const { Box, Code } = table;
	return el(
		Box,
		{ flexDirection: "column", marginTop: 1 },
		el(Box, { flexDirection: "column", marginBottom: 1 }, starred(table, tag, line)),
		cards.map((card) =>
			el(
				Box,
				{ flexDirection: "column", marginBottom: 1, marginLeft: 2 },
				prose(table, card.lead, card.title),
				card.sketch.length > 0
					? el(Code, {
						source: card.sketch.map((s) => (s === "" ? " " : s)).join("\n"),
						language: "text",
						wrap: "truncate-end",
					})
					: "",
				prose(table, card.caption, ""),
			),
		),
		on === null
			? ""
			: choicesRow(table, [
				{ hotkey: "1", label: "Understood", onPress: on.gotIt },
				{ hotkey: "2", label: "Chat in main session", onPress: on.respond },
				{ hotkey: "0", label: "Dismiss", onPress: on.dismiss, role: "dismiss" },
			]),
	);
}

export function stillRow(table: Table, text: string): Node {
	const { Box, Text } = table;
	return el(
		Box,
		{ marginTop: 1 },
		el(Text, { ...leadInkOf(table).star }, "✦"),
		el(Text, { wrap: "truncate-end", dimColor: true }, " ", text),
	);
}

export const explainingRow = (table: Table): Node => stillRow(table, "One moment…");

export type FailedKind = "publish" | "blocked" | "explain" | "turn_off" | string;

const FAILED_TEXT: Readonly<Record<string, string>> = {
	publish: "Couldn’t publish that page",
	blocked: "Not published (blocked by a permission setting)",
	explain: "Couldn’t write that explanation",
	turn_off: "Couldn’t turn suggestions off here. Use /plugin.",
};

export function failedRow(table: Table, kind: FailedKind, onOk: () => void): Node {
	const { Box, Text } = table;
	return el(
		Box,
		{ marginTop: 1 },
		el(
			Text,
			{ wrap: "truncate-end" },
			lead(table),
			FAILED_TEXT[kind] ?? "Couldn’t write that page",
			" ",
			el(Text, { dimColor: true }, "·"),
			" ",
		),
		choice(table, { hotkey: "0", label: "OK", onPress: onOk }),
	);
}

export const wayOutChoices = (
	off: (() => void) | undefined,
	isArmed: boolean,
): readonly Choice[] =>
	off === undefined
		? []
		: [
			{
				hotkey: "4",
				label: isArmed ? "Press again to disable" : OFFER_LABELS.off,
				onPress: off,
				isDim: true,
			},
		];

export type OfferHandlers = {
	readonly explain?: (() => void) | undefined;
	readonly knew?: (() => void) | undefined;
	readonly off?: (() => void) | undefined;
	readonly later?: (() => void) | undefined;
};

function offerHead(
	table: Table,
	args: { readonly lead: Node; readonly body: unknown; readonly surface: string; readonly copy: Copy },
): Node {
	const { Box, Text } = table;
	if (args.surface === "desktop") {
		return el(
			Box,
			{ flexDirection: "row", alignItems: "flex-start" },
			el(
				Box,
				{ key: "about", flexShrink: 0 },
				args.lead,
				args.copy.length > 0 ? aboutCard(table, args.copy) : undefined,
			),
			el(Text, { wrap: "wrap" }, args.body),
		);
	}
	return el(Text, { wrap: "wrap" }, args.lead, args.body);
}

export function offerRow(
	table: Table,
	line: string,
	on: OfferHandlers,
	isOffArmed: boolean,
	about: About = ABOUT_CLOSED,
	tag: string = DEFAULT_TAG,
): Node {
	const { Box } = table;
	const before: Choice[] = [
		{ hotkey: "1", label: OFFER_LABELS.explain, onPress: on.explain },
		{ hotkey: "2", label: OFFER_LABELS.knew, onPress: on.knew },
	];
	const after: Choice[] = [
		...wayOutChoices(on.off, isOffArmed),
		{ hotkey: "0", label: OFFER_LABELS.later, onPress: on.later, role: "dismiss" },
	];
	const fit = aboutFit(about, { tag, line, before, after });
	const shown =
		fit.note.length > 0
			? { tag: undefined, body: noteSpans(table, fit.note, { dimColor: true }) }
			: { tag, body: line };
	const isTerminal = about.surface === "terminal";
	return el(
		Box,
		{ flexDirection: "column", marginTop: 1 },
		isTerminal
			? starred(table, shown.tag, shown.body)
			: offerHead(table, {
				lead: lead(table, shown.tag),
				body: shown.body,
				surface: about.surface,
				copy: about.copy,
			}),
		choicesRow(table, [...before, ...fit.choices, ...after]),
	);
}
