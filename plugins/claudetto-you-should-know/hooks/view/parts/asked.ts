/** The rows shown after a dismissal: the asked row and its explained variant. */

import type { Choice } from "../copy";
import type { Table } from "../table";
import { CHOICE_GAP } from "../../text/text";
import { choice, el, lead, type Node, starColumn } from "./elements";

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
