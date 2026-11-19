/** The building blocks every row shares: the element helper, hotkeyed choices and the star lead. */

import { STAR_CELLS } from "../../shared/constants";
import { CHOICE_GAP } from "../../text/text";
import type { Choice } from "../copy";
import { leadInkOf, type Table } from "../table";

export type Node = unknown;

/** Creates one element through the host's `h`, typed loosely because element tables differ per surface. */
export const el = (tag: unknown, props: Record<string, unknown> | null, ...kids: unknown[]): Node =>
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

export function stillRow(table: Table, text: string): Node {
	const { Box, Text } = table;
	return el(
		Box,
		{ marginTop: 1 },
		el(Text, { ...leadInkOf(table).star }, "✦"),
		el(Text, { wrap: "truncate-end", dimColor: true }, " ", text),
	);
}
