// The fenced code of Markdown, read as CommonMark: the lines of a text with each fenced line blank.

const FENCE = /^([ \t]*)(`{3,}|~{3,})(.*)$/;
const ITEM = /^( *(?:[-*+]|\d{1,9}[.)]))(?:([ \t]+)(\S)?|$)/;
const NON_BLANK_START = /^\S/;
const BREAK = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/;

/**
 * The width of the list item content that the line `l` opens, or the width of the item before it. A line with no indent ends the item.
 * CommonMark: 5 or more columns after the marker leave the rest as indented code, so the width is the marker plus 1, and an empty item has that width too.
 * A thematic break (`* * *`) is no item, and a blank line after an empty item (`empty`) closes it.
 */
const itemWidth = (l: string, item: number, empty: boolean): number => {
	const [, marker = "", gap = "", text = ""] = BREAK.test(l)
		? []
		: (ITEM.exec(l) ?? []);
	if (!marker) {
		return (!l.trim() && empty) || NON_BLANK_START.test(l) ? 0 : item;
	}
	const start = columns(marker);
	const after = columns(marker + gap) - start;
	return text && after < 5 ? start + after : start + 1;
};

/** CommonMark: a tab in the indent goes to the next multiple of 4 columns. */
const columns = (indent: string): number => {
	let width = 0;
	for (const c of indent) {
		width = c === "\t" ? width + 4 - (width % 4) : width + 1;
	}
	return width;
};

/** CommonMark: a fence has 0 to 3 columns of indent, and a list item adds the width of its content. */
const fenceIndent = (space: number, item: number): boolean =>
	space <= 3 || (item > 0 && space >= item);

/** CommonMark: the info string of a backtick fence holds no backtick. */
const opens = (run: string, info: string): boolean =>
	run !== "" && !(run[0] === "`" && info.includes("`"));

/** CommonMark: a closing fence is at least as long as its opener and has no info string. */
const closes = (open: string, run: string, info: string): boolean =>
	run[0] === open[0] && run.length >= open.length && !info.trim();

/** The lines with each fenced line blank, so that no pattern matches inside a code block. */
export const plain = (ls: string[]): string[] => {
	let open = "";
	let item = 0;
	let empty = false;
	return ls.map((l) => {
		if (!open) {
			item = itemWidth(l, item, empty);
			empty = !BREAK.test(l) && ITEM.test(l) && !ITEM.exec(l)?.[3];
		}
		const [, space = "", run = "", info = ""] = FENCE.exec(l) ?? [];
		const fence = fenceIndent(columns(space), item);
		if (!open) {
			if (!(fence && opens(run, info))) {
				return l;
			}
			open = run;
		} else if (fence && closes(open, run, info)) {
			open = "";
		}
		return "";
	});
};

/** The text with each fenced line blank. */
export const unfenced = (text: string): string =>
	plain(text.split("\n")).join("\n");
