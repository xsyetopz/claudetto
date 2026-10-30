import type { Card } from "./cards.ts";

const LEAD_IN = "Here is a note offered by a side agent:";

const FENCE = "`".repeat(3);

/** The presentation selectors stay: dropping one turns an emoji into a plain glyph. */
const INVISIBLE = /(?![︎️])\p{Default_Ignorable_Code_Point}/gu;

const AT_MENTION = /(^|[\s。、？！])@(?!\s)/g;

const PLACEHOLDER =
	/\[(?:Pasted text|Image|\.\.\.Truncated text|✦ Team setup guide) #\d+(?: \+\d+ lines)?\.*\]/g;

const ULTRA_KEYWORD = /(ultra)(code|plan|review|think)/gi;

/** The box reads an at-mention, a paste placeholder, and an ultra keyword as input, so each is folded to look the same and do nothing. */
export const cleanForDraft = (text: string): string =>
	text
		.replace(INVISIBLE, "")
		.replace(AT_MENTION, "$1＠")
		.replace(PLACEHOLDER, (found) => `［${found.slice(1)}`)
		.replace(ULTRA_KEYWORD, "$1-$2");

const cardText = (card: Card): string =>
	[
		card.title === "" ? "" : `**${card.title}**`,
		card.lead,
		card.sketch.length > 0 ? [FENCE, ...card.sketch, FENCE].join("\n") : "",
		card.caption,
	]
		.filter((part) => part !== "")
		.join("\n");

const quoted = (text: string): string =>
	text
		.split("\n")
		.map((line) => (line === "" ? ">" : `> ${line}`))
		.join("\n");

export const draftOf = (
	tag: string,
	line: string,
	cards: readonly Card[],
): string =>
	cleanForDraft(
		`${LEAD_IN}\n\n${quoted([`${tag} · ${line}`, ...cards.map(cardText)].join("\n\n"))}`,
	);
