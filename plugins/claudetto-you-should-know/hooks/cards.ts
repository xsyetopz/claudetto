/** Parses an explanation into at most four cards: title, lead, sketch, caption. */

import {
	MAX_CAPTION_LENGTH,
	MAX_CARDS,
	MAX_SKETCH_LINES,
	MAX_SKETCH_WIDTH,
	MAX_TITLE_WIDTH,
} from "./constants";
import {
	cleanOneLine,
	proseOf,
	sliceCodePointsHead,
	stripControlSequences,
	truncateAtWordBoundary,
} from "./text";

export type Card = {
	title: string;
	lead: string;
	sketch: readonly string[];
	caption: string;
};

export const FENCE_LINE = /^```/;
export const TITLE_LINE = /^(?:\*\*([^*]+)\*\*|#+\s*(.+))$/;

export const emptyCard = (): Card => ({
	title: "",
	lead: "",
	sketch: [],
	caption: "",
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
			MAX_CAPTION_LENGTH,
		);
		if (card.title || card.lead || card.sketch.length > 0 || card.caption) {
			cards.push(card);
		}
		card = emptyCard();
	};
	for (const raw of text.split("\n")) {
		const line = stripControlSequences(raw).replace(/\s+$/, "");
		if (FENCE_LINE.test(line.trim())) {
			if (!inFence && sawFence) {
				flush();
			}
			inFence = !inFence;
			sawFence = true;
			continue;
		}
		if (inFence) {
			if (card.sketch.length < MAX_SKETCH_LINES) {
				card.sketch = [
					...card.sketch,
					sliceCodePointsHead(line, MAX_SKETCH_WIDTH),
				];
			}
			continue;
		}
		const title = TITLE_LINE.exec(line.trim());
		if (title) {
			flush();
			sawFence = false;
			card.title = sliceCodePointsHead(
				cleanOneLine(title[1] ?? title[2] ?? ""),
				MAX_TITLE_WIDTH,
			);
			continue;
		}
		const part = card.sketch.length === 0 && !sawFence ? "lead" : "caption";
		card[part] += `\n${line}`;
	}
	flush();
	return cards.slice(0, MAX_CARDS);
}
