/** The explanation rows: the cards of an explained note and the row shown while one is written. */

import type { Card } from "../../request/cards";
import { DEFAULT_TAG } from "../../shared/constants";
import { proseMarkdown } from "../../text/markdown";
import type { Table } from "../table";
import { choicesRow, el, type Node, starred, stillRow } from "./elements";

function prose(table: Table, text: string, title: string): Node {
	const markdown = proseMarkdown(text, title);
	if (markdown === "") {
		return "";
	}
	return el(table.Markdown, { text: markdown });
}

export interface ExplainedHandlers {
	readonly gotIt?: (() => void) | undefined;
	readonly respond?: (() => void) | undefined;
	readonly dismiss?: (() => void) | undefined;
}

export function explainedRow(
	table: Table,
	line: string,
	cards: readonly Card[],
	on: ExplainedHandlers | null,
	tag: string = DEFAULT_TAG
): Node {
	const { Box, Code } = table;
	return el(
		Box,
		{ flexDirection: "column", marginTop: 1 },
		el(
			Box,
			{ flexDirection: "column", marginBottom: 1 },
			starred(table, tag, line)
		),
		cards.map((card) =>
			el(
				Box,
				{ flexDirection: "column", marginBottom: 1, marginLeft: 2 },
				prose(table, card.lead, card.title),
				card.sketch.length > 0
					? el(Code, {
							source: card.sketch.map((s) => (s === "" ? " " : s)).join("\n"),
							language: "text",
							wrap: "truncate-end"
						})
					: "",
				prose(table, card.caption, "")
			)
		),
		on === null
			? ""
			: choicesRow(table, [
					{ hotkey: "1", label: "Understood", onPress: on.gotIt },
					{ hotkey: "2", label: "Chat in main session", onPress: on.respond },
					{
						hotkey: "0",
						label: "Dismiss",
						onPress: on.dismiss,
						role: "dismiss"
					}
				])
	);
}

export const explainingRow = (table: Table): Node =>
	stillRow(table, "One moment…");
