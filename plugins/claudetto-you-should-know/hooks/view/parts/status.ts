/** Status rows: the debug check log and the failure notice with its OK button. */

import { type Check, checkLineOf } from "../../check/log";
import { leadInkOf, type Table } from "../table";
import { choice, el, lead, type Node } from "./elements";

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
