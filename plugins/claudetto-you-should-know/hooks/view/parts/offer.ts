/** The offer row: the note line, its About copy where the surface has room, and the offer choices. */

import { DEFAULT_TAG, OFFER_LABELS } from "../../shared/constants";
import { ABOUT_CLOSED, type About, aboutCard, aboutFit, type Choice, type Copy, noteSpans } from "../copy";
import type { Table } from "../table";
import { choicesRow, el, lead, type Node, starred } from "./elements";

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
