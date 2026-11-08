import {
	DEFAULT_TAG,
	DRAFT_LEAD,
	TOAST_DIALOG_OPEN,
	TOAST_NOT_FILLED,
} from "./texts.ts";

export const LIMITS = {
	checkEvery: 6,
	clearAfterPrompts: 2,
	freeIgnores: 2,
	maxSkips: 16,
	askedMs: 20_000,
	listMax: 50,
	sessionsMax: 32,
	lineChars: 240,
	logEntries: 8,
	entryChars: 992,
	maxTokens: 512,
	cards: 4,
	titleChars: 120,
	sketchLines: 12,
	sketchChars: 120,
	proseChars: 4000,
} as const;

export interface Card {
	readonly title: string;
	readonly lead: string;
	readonly sketch: readonly string[];
	readonly caption: string;
}

export interface Offer {
	readonly line: string;
	readonly tag: string;
	readonly explanation: string;
}

export type ViewKind = "offer" | "asked" | "explained";

export interface View {
	readonly kind: ViewKind;
	readonly line: string;
	readonly explanation: string;
	readonly shownAt: number;
}

export interface Row {
	readonly id: string;
	readonly view: View | null;
	readonly tag: string;
	readonly offeredTurn: string;
	readonly askedTurn: string;
}

const LEARN = /^learn[ \t]*:[ \t]*/i;
const EXPLAIN = /^explain[ \t]*:[ \t]*/i;
const TAG = /^tag[ \t]*:[ \t]*(.*)$/i;
const FENCE = /^`{3}/;
const FINAL_PERIOD = /\.$/;
const TITLE = /^(?:\*\*([^*]+)\*\*|#{1,6}[ \t]*(.+))$/;

export const parseReply = (text: string): Offer | undefined => {
	const lines = text.split("\n").map((l) => l.trim());
	const head = lines.find((l) => LEARN.test(l));
	const said = head?.replace(LEARN, "").trim();
	if (
		said === undefined ||
		said === "" ||
		said.length > LIMITS.lineChars ||
		sameLine(said, "none")
	) {
		return undefined;
	}
	const tagValue = lines
		.map((l) => TAG.exec(l)?.[1])
		.find((value) => value !== undefined);
	const at = lines.findIndex((l) => EXPLAIN.test(l));
	const explanation =
		at === -1
			? ""
			: [(lines[at] ?? "").replace(EXPLAIN, ""), ...lines.slice(at + 1)]
					.join("\n")
					.trim();
	return {
		line: said,
		tag:
			tagValue?.toLowerCase().replace(/[\s-]+/g, " ") === "heads up"
				? "Heads up"
				: DEFAULT_TAG,
		explanation,
	};
};

const clipAtWord = (text: string, max: number): string => {
	if (text.length <= max) {
		return text;
	}
	const cut = text.slice(0, max);
	const space = cut.lastIndexOf(" ");
	return (space > 0 ? cut.slice(0, space) : cut).trimEnd();
};

interface CardDraft {
	title: string;
	lead: string[];
	sketch: string[];
	caption: string[];
	sketched: boolean;
}

const newDraft = (title: string): CardDraft => ({
	title,
	lead: [],
	sketch: [],
	caption: [],
	sketched: false,
});

const titleOf = (line: string): string | undefined => {
	const found = TITLE.exec(line);
	return (found?.[1] ?? found?.[2])?.trim().slice(0, LIMITS.titleChars);
};

const currentDraft = (drafts: CardDraft[]): CardDraft => {
	const last = drafts.at(-1) ?? newDraft("");
	if (drafts.length === 0) {
		drafts.push(last);
	}
	return last;
};

const feed = (drafts: CardDraft[], raw: string, fenced: boolean): boolean => {
	const line = raw.trim();
	const title = fenced ? undefined : titleOf(line);
	if (title !== undefined) {
		drafts.push(newDraft(title));
		return fenced;
	}
	if (line === "" && !fenced) {
		return fenced;
	}
	const card = currentDraft(drafts);
	if (FENCE.test(line)) {
		card.sketched = true;
		return !fenced;
	}
	if (fenced) {
		if (card.sketch.length < LIMITS.sketchLines) {
			card.sketch.push(raw.slice(0, LIMITS.sketchChars));
		}
	} else {
		(card.sketched ? card.caption : card.lead).push(line);
	}
	return fenced;
};

const finish = (d: CardDraft): Card => ({
	title: d.title,
	lead: clipAtWord(d.lead.join("\n"), LIMITS.proseChars),
	sketch: d.sketch,
	caption: clipAtWord(d.caption.join("\n"), LIMITS.proseChars),
});

export const parseCards = (text: string): readonly Card[] => {
	const drafts: CardDraft[] = [];
	let fenced = false;
	for (const raw of text.split("\n")) {
		fenced = feed(drafts, raw, fenced);
	}
	return drafts.slice(0, LIMITS.cards).map(finish);
};

const INVISIBLE = /(?![︎️])\p{Default_Ignorable_Code_Point}/gu;
const AT_MENTION = /(^|[\s。、？！])@(?!\s)/g;
const PLACEHOLDER =
	/\[(?:Pasted text|Image|\.\.\.Truncated text|✦ Team setup guide) #\d+(?: \+\d+ lines)?\.*\]/g;
const ULTRA = /(ultra)(code|plan|review|think)/gi;

const neutralise = (text: string): string =>
	text
		.replace(INVISIBLE, "")
		.replace(AT_MENTION, "$1＠")
		.replace(PLACEHOLDER, (found) => `［${found.slice(1)}`)
		.replace(ULTRA, "$1-$2");

const cardText = (card: Card): string =>
	[
		card.title === "" ? "" : `**${card.title}**`,
		card.lead,
		card.sketch.length > 0 ? ["```", ...card.sketch, "```"].join("\n") : "",
		card.caption,
	]
		.filter((part) => part !== "")
		.join("\n");

export const draftFor = (tag: string, view: View): string => {
	const body = [
		`${tag} · ${view.line}`,
		...parseCards(view.explanation).map(cardText),
	]
		.join("\n\n")
		.split("\n")
		.map((line) => (line === "" ? ">" : `> ${line}`))
		.join("\n");
	return neutralise(`${DRAFT_LEAD}\n\n${body}`);
};

export type FillOutcome =
	| { readonly next: "close" }
	| { readonly next: "submit" }
	| { readonly next: "toast"; readonly text: string };

export const fillOutcome = (filled: {
	readonly isFilled: boolean;
	readonly refusal?: "dialog" | "no_composer" | undefined;
}): FillOutcome => {
	if (filled.isFilled) {
		return { next: "close" };
	}
	if (filled.refusal === "no_composer") {
		return { next: "submit" };
	}
	return {
		next: "toast",
		text: filled.refusal === "dialog" ? TOAST_DIALOG_OPEN : TOAST_NOT_FILLED,
	};
};

const lineKey = (line: string): string =>
	line.trim().toLowerCase().replace(FINAL_PERIOD, "");

export const sameLine = (a: string, b: string): boolean =>
	lineKey(a) === lineKey(b);

export const isRepeat = (
	line: string,
	...lists: readonly (readonly string[])[]
): boolean => lists.some((list) => list.some((other) => sameLine(other, line)));

export const remember = (
	list: readonly string[],
	line: string,
): readonly string[] =>
	[...list.filter((other) => !sameLine(other, line)), line].slice(
		-LIMITS.listMax,
	);

export const skipsAfter = (ignored: number): number =>
	ignored <= LIMITS.freeIgnores
		? 0
		: Math.min(LIMITS.maxSkips, 2 ** (ignored - LIMITS.freeIgnores - 1));

export const isCheckStep = (index: number): boolean =>
	index > 0 && index % LIMITS.checkEvery === 0;

export const logEntry = (who: "person" | "assistant", text: string): string =>
	`${who}: ${text.trim()}`.slice(0, LIMITS.entryChars);

export const blankRow = (id: string): Row => ({
	id,
	view: null,
	tag: DEFAULT_TAG,
	offeredTurn: "",
	askedTurn: "",
});

export const closed = (row: Row): Row => ({ ...row, view: null });

const keepRank = (row: Row): number => (row.view === null ? 0 : 1);

export const withRow = (rows: readonly Row[], row: Row): readonly Row[] =>
	[
		row,
		...rows
			.filter((other) => other.id !== row.id)
			.toSorted((a, b) => keepRank(b) - keepRank(a)),
	].slice(0, LIMITS.sessionsMax);

const isView = (value: unknown): value is View =>
	typeof value === "object" &&
	value !== null &&
	"kind" in value &&
	(value.kind === "offer" ||
		value.kind === "asked" ||
		value.kind === "explained") &&
	"line" in value &&
	typeof value.line === "string" &&
	"explanation" in value &&
	typeof value.explanation === "string" &&
	"shownAt" in value &&
	typeof value.shownAt === "number";

const isRow = (value: unknown): value is Row =>
	typeof value === "object" &&
	value !== null &&
	"id" in value &&
	typeof value.id === "string" &&
	"view" in value &&
	(value.view === null || isView(value.view)) &&
	"tag" in value &&
	typeof value.tag === "string" &&
	"offeredTurn" in value &&
	typeof value.offeredTurn === "string" &&
	"askedTurn" in value &&
	typeof value.askedTurn === "string";

export const rowsOf = (value: unknown): readonly Row[] =>
	Array.isArray(value) ? value.filter(isRow) : [];

export const linesOf = (value: unknown): readonly string[] =>
	Array.isArray(value)
		? value.filter((item): item is string => typeof item === "string")
		: [];

export const countOf = (value: unknown): number =>
	typeof value === "number" && Number.isFinite(value) && value > 0
		? Math.floor(value)
		: 0;
