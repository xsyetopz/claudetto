import { BORROWED } from "./constants.ts";

export interface Card {
	readonly title: string;
	readonly lead: string;
	readonly sketch: readonly string[];
	readonly caption: string;
}

interface Draft {
	title: string;
	readonly lead: string[];
	readonly sketch: string[];
	readonly caption: string[];
	sketched: boolean;
}

// No quote mark or backtick sits in a pattern here, so the lexer of `tools/source-text.ts` reads it.
const FENCE_LINE = /^\x60{3}/;
const TITLE_LINE = /^(?:\*\*([^*]+)\*\*|#{1,6}[ \t]*(.+))$/;

const freshDraft = (title: string): Draft => ({
	title,
	lead: [],
	sketch: [],
	caption: [],
	sketched: false,
});

const clipWords = (text: string, max: number): string => {
	if (text.length <= max) {
		return text;
	}
	const cut = text.slice(0, max);
	const space = cut.lastIndexOf(" ");
	return (space > 0 ? cut.slice(0, space) : cut).trimEnd();
};

const titleOf = (line: string): string | undefined => {
	const found = TITLE_LINE.exec(line.trim());
	const title = found?.[1] ?? found?.[2];
	return title === undefined
		? undefined
		: title.trim().slice(0, BORROWED.MAX_TITLE_WIDTH);
};

const currentOf = (drafts: Draft[]): Draft => {
	const last = drafts.at(-1);
	if (last !== undefined) {
		return last;
	}
	const made = freshDraft("");
	drafts.push(made);
	return made;
};

const addText = (draft: Draft, line: string): void => {
	(draft.sketched ? draft.caption : draft.lead).push(line.trim());
};

const finished = (draft: Draft): Card => ({
	title: draft.title,
	lead: clipWords(draft.lead.join("\n"), BORROWED.MAX_CAPTION_LENGTH),
	sketch: draft.sketch,
	caption: clipWords(draft.caption.join("\n"), BORROWED.MAX_CAPTION_LENGTH),
});

export const parseExplanation = (text: string): readonly Card[] => {
	const drafts: Draft[] = [];
	let fenced = false;
	for (const line of text.split("\n")) {
		if (FENCE_LINE.test(line.trim())) {
			fenced = !fenced;
			currentOf(drafts).sketched = true;
		} else if (fenced) {
			const draft = currentOf(drafts);
			if (draft.sketch.length < BORROWED.MAX_SKETCH_LINES) {
				draft.sketch.push(line.slice(0, BORROWED.MAX_SKETCH_WIDTH));
			}
		} else {
			const title = titleOf(line);
			if (title !== undefined) {
				drafts.push(freshDraft(title));
			} else if (line.trim() !== "") {
				addText(currentOf(drafts), line);
			}
		}
	}
	return drafts.map(finished).slice(0, BORROWED.MAX_CARDS);
};
