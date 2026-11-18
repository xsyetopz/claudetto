/** Text helpers: control-sequence stripping, one-line cleanup, truncation, and terminal cell widths. */

export const WIDE_FROM = 4352;
export const WRAP_RESERVE_CELLS = 1;
export const KEY_TEXT = "0: ";
export const CHOICE_GAP = 3;

export const ansiSequence = (): RegExp =>
	new RegExp(
		String.raw`[\u001B\u009B][[\]()#;?]*` +
			String.raw`(?:(?:(?:(?:;[-a-zA-Z\d/#&.:=?%@~_]+)*` +
			String.raw`|[a-zA-Z\d]+(?:;[-a-zA-Z\d/#&.:=?%@~_]*)*)?` +
			String.raw`(?:\u0007|\u001B\u005C|\u009C))` +
			String.raw`|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))`,
		"g",
	);

export const cleanOneLine = (text: string): string =>
	text
		// biome-ignore lint/suspicious/noControlCharactersInRegex: strips C0 and C1 controls from model text
		.replace(/[\x00-\x08\x0E-\x1F\x7F-\x9F]/g, "")
		.replace(/\s+/g, " ")
		.trim();

export function sliceCodePointsHead(text: string, count: number): string {
	if (count <= 0) {
		return "";
	}
	if (text.length <= count) {
		return text;
	}
	return text.slice(0, count).replace(/[\uD800-\uDBFF]$/, "");
}

export const stripControlSequences = (text: string): string =>
	text
		.replace(/\p{Cs}/gu, "")
		.replace(ansiSequence(), "")
		.replace(/[\p{Cc}\p{Cf}\u2028\u2029]/gu, "");

export function truncateAtWordBoundary(text: string, max: number): string {
	if (text.length <= max) {
		return text;
	}
	const head = sliceCodePointsHead(text, max - 1);
	const cut = head.search(/\s\S*$/);
	const atWord = cut !== -1 ? head.slice(0, cut).trimEnd() : "";
	return `${atWord.length > max / 2 ? atWord : head.trimEnd()}…`;
}

export const proseOf = (text: string): string =>
	text
		.split("\n")
		.map((line) => cleanOneLine(line))
		.filter((line) => line !== "")
		.join("\n");

export const cellsAtMost = (text: string): number =>
	[...text].reduce(
		(sum, ch) => sum + ((ch.codePointAt(0) ?? 0) >= WIDE_FROM ? 2 : 1),
		0,
	);

/** Rows a space-wrapped run of words takes in `width` cells. */
export function wrapRows(text: string, width: number): number {
	const limit = Math.max(width - WRAP_RESERVE_CELLS, 1);
	let rows = 0;
	let used = 0;
	for (const word of text.split(" ").filter((w) => w !== "")) {
		const cells = cellsAtMost(word);
		if (rows === 0 || used + 1 + cells > limit) {
			rows += Math.ceil(Math.max(cells, 1) / limit);
			used = cells % limit === 0 ? limit : cells % limit;
		} else {
			used += 1 + cells;
		}
	}
	return rows;
}

export function choicesRows(args: {
	readonly columns: number;
	readonly labels: readonly string[];
}): number {
	const columns = Math.max(args.columns, 1);
	let rows = 1;
	let used = 0;
	for (const label of args.labels) {
		const text = KEY_TEXT + label;
		const width = cellsAtMost(text) + CHOICE_GAP;
		const wraps = used > 0 && used + width > columns;
		const tooWide = width > columns;
		const own = tooWide ? wrapRows(text, columns - CHOICE_GAP) : 1;
		const start = wraps ? 0 : used;
		rows += (wraps ? 1 : 0) + own - 1;
		used = tooWide ? columns : start + width;
	}
	return rows;
}
