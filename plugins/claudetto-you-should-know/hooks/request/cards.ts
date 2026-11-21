/** Parses an explanation into at most four cards: title, lead, sketch, caption. */

import {
	MAX_CAPTION_LENGTH,
	MAX_CARDS,
	MAX_SKETCH_LINES,
	MAX_SKETCH_WIDTH,
	MAX_TITLE_WIDTH
} from "../shared/constants";
import {
	cleanOneLine,
	proseOf,
	sliceUnitsHead,
	stripControlSequences,
	truncateAtWordBoundary
} from "../text/text";

export interface Card {
	title: string;
	lead: string;
	sketch: readonly string[];
	caption: string;
}

export const FENCE_LINE = /^```/u;
export const TITLE_LINE = /^(?:\*\*([^*]+)\*\*|#+\s*(.+))$/u;

export const emptyCard = (): Card => ({
	title: "",
	lead: "",
	sketch: [],
	caption: ""
});

export function parseExplanation(text: string): readonly Card[] {
	const cards: Card[] = [];
	let card = emptyCard();
	let inFence = false;
	let sawFence = false;
	const flush = (): void => {
		card.lead = truncateAtWordBoundary(proseOf(card.lead), MAX_CAPTION_LENGTH);
		card.caption = truncateAtWordBoundary(
			proseOf(card.caption),
			MAX_CAPTION_LENGTH
		);
		if (card.title || card.lead || card.sketch.length > 0 || card.caption) {
			cards.push(card);
		}
		card = emptyCard();
	};
	for (const raw of text.split("\n")) {
		const line = stripControlSequences(raw).replace(/\s+$/u, "");
		if (line.trim().startsWith("```")) {
			if (!inFence && sawFence) {
				flush();
			}
			inFence = !inFence;
			sawFence = true;
			continue;
		}
		if (inFence) {
			if (card.sketch.length < MAX_SKETCH_LINES) {
				card.sketch = [...card.sketch, sliceUnitsHead(line, MAX_SKETCH_WIDTH)];
			}
			continue;
		}
		const title = TITLE_LINE.exec(line.trim());
		if (title) {
			flush();
			sawFence = false;
			card.title = truncateAtWordBoundary(
				cleanOneLine(title[1] ?? title[2] ?? ""),
				MAX_TITLE_WIDTH
			);
			continue;
		}
		const part = card.sketch.length === 0 && !sawFence ? "lead" : "caption";
		card[part] += `\n${line}`;
	}
	flush();
	return cards.slice(0, MAX_CARDS);
}
