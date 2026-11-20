/** Fits card titles and sketch lines to the terminal width by cell count. */

import type { Card } from "../request/cards";
import { CARD_INSET, FALLBACK_COLUMNS } from "../shared/constants";

const NARROW = {
	hangulJamo: 4352,
	punctuation: { first: 8208, last: 8286 },
	arrows: { first: 8592, last: 8703 },
	shapes: { first: 9472, last: 9727 },
	mediumSmallSquares: { white: 9725, black: 9726 }
};

export function glyphCellsAtMost(code: number): number {
	const { hangulJamo, punctuation, arrows, shapes, mediumSmallSquares } =
		NARROW;
	if (
		code < hangulJamo ||
		(code >= punctuation.first && code <= punctuation.last) ||
		(code >= arrows.first && code <= arrows.last) ||
		(code >= shapes.first &&
			code <= shapes.last &&
			code !== mediumSmallSquares.white &&
			code !== mediumSmallSquares.black)
	) {
		return 1;
	}
	return 2;
}

export function lineCellsAtMost(text: string): number {
	let cells = 0;
	for (const ch of text) {
		cells += glyphCellsAtMost(ch.codePointAt(0) ?? 0);
	}
	return cells;
}

export function fitLine(text: string, width: number): string {
	if (lineCellsAtMost(text) <= width) {
		return text;
	}
	let cells = 0;
	let out = "";
	for (const ch of text) {
		cells += lineCellsAtMost(ch);
		if (cells > width - 1) {
			return `${out}…`;
		}
		out += ch;
	}
	return out;
}

export function fitCards(
	cards: readonly Card[],
	columns: number
): readonly Card[] {
	const wide = Number.isFinite(columns) ? columns : FALLBACK_COLUMNS;
	const room = Math.max(wide - CARD_INSET, 1);
	return cards.map((card) => ({
		...card,
		title: fitLine(card.title, room),
		sketch: card.sketch.map((line) => fitLine(line, room))
	}));
}
