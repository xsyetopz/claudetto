// The page holds the figures, because a budget is only as good as the reading beside it, and a
// reading that lives in a comment is read by nobody.
//
// An agent file used as the main thread replaces the default body rather than adding to it
// (`docs/prompt/overrides.md`), so a file above that size makes every request of every session
// larger than a stock session. A tool text replaces the harness's description, so its budget is the
// smaller of the two stock readings of `plugins/claudetto/src/tools/tools.ts`.
//
// What counts is what the harness sends, not the size on disk.

import { file as bunFile } from "bun";
import { TOOL_TEXTS } from "../plugins/claudetto/src/tools/texts.ts";
import { stockOf } from "../plugins/claudetto/src/tools/tools.ts";
import { bare, tableRows } from "./md-table.ts";

/** A piece that is a prompt file of the plugin, named by its path. */
export const FILE = "file";

/** A piece that is a description claudetto offers for a tool, named by the tool. */
export const TOOL_TEXT = "tool text";

/** A budget on the text as the file holds it. */
export const AS_CHARACTERS = "characters";

/** A budget on the text as the request carries it, JSON escapes included. */
export const AS_REQUEST = "request JSON";

/** One budget row of the prompt-footprint page, with fields as read so that a bad value can be reported as a fault. */
export interface PromptBudget {
	/** The path inside `plugins/claudetto`, or the tool name. */
	readonly piece: string;
	/** `FILE` or `TOOL_TEXT`. Another value is a fault. */
	readonly kind: string;
	/** The largest size the piece may have, in the unit of `measuredAs`. */
	readonly budget: number;
	/** `AS_CHARACTERS` or `AS_REQUEST`. Another value is a fault. */
	readonly measuredAs: string;
	/** Where the budget was read. */
	readonly reading: string;
}

/** The page that holds the budgets, as a path from the repo root, so a read of it depends on the working directory. */
export const BUDGET_PAGE = "docs/prompt/footprint.md";

/** The heading the table sits under. */
export const BUDGET_HEADING = "## Byte Budgets";

const THOUSANDS = /,/g;

const rowOf = (cells: readonly string[]): PromptBudget => ({
	piece: bare(cells[0] ?? ""),
	kind: bare(cells[1] ?? ""),
	budget: Number((cells[2] ?? "").replace(THOUSANDS, "")),
	measuredAs: bare(cells[3] ?? ""),
	reading: cells[4] ?? "",
});

/** The budgets of a page, read from the table under `heading`. */
export const parseBudgets = (
	page: string,
	heading = BUDGET_HEADING,
): readonly PromptBudget[] =>
	tableRows(page, heading)
		.filter((cells) => cells.length >= 5)
		.map(rowOf);

/**
 * Reads the page and parses it. The parse itself is `parseBudgets`, apart from this so that a test
 * reaches it with planted text and never touches the real page.
 */
export const readBudgets = async (
	page = BUDGET_PAGE,
): Promise<readonly PromptBudget[]> => parseBudgets(await bunFile(page).text());

/** The end of the YAML front matter of a prompt file, or 0 when the file has none. */
const bodyStart = (text: string): number => {
	if (!text.startsWith("---\n")) {
		return 0;
	}
	const close = text.indexOf("\n---", 3);
	return close < 0 ? 0 : close + 4;
};

/** The characters the harness sends for the text of a prompt file. */
export const sentChars = (text: string): number =>
	text.slice(bodyStart(text)).trim().length;

/**
 * The length the sent text occupies in the request, which carries it as a JSON string. A newline and
 * a quote each take two characters there and one in the file, so this is the figure to bound when the
 * budget is "no larger than the text we replace": a body may lose a character and still cost the
 * request the same, which a count of characters alone reports as a saving.
 */
export const sentRequestChars = (text: string): number =>
	JSON.stringify(text.slice(bodyStart(text)).trim()).length - 2;

/** The characters the harness sends for a prompt file of the plugin: its body, trimmed. */
export const promptChars = async (
	path: string,
	root = "plugins/claudetto",
): Promise<number> => sentChars(await bunFile(`${root}/${path}`).text());

/** The length a prompt file of the plugin occupies in the request. */
export const promptRequestChars = async (
	path: string,
	root = "plugins/claudetto",
): Promise<number> => sentRequestChars(await bunFile(`${root}/${path}`).text());

/** The length of a string in the unit a row declares. */
const inUnit = (value: string, measuredAs: string): number =>
	measuredAs === AS_REQUEST ? JSON.stringify(value).length - 2 : value.length;

/** The size a piece sends in the unit its row declares, or a fault line. */
const sentOf = async (
	row: PromptBudget,
	root: string,
): Promise<number | string> => {
	if (row.kind === TOOL_TEXT) {
		const stock = TOOL_TEXTS[row.piece];
		return stock === undefined
			? `${row.piece} is in the table as a ${TOOL_TEXT}, and no text of that name ships`
			: inUnit(stock, row.measuredAs);
	}
	if (row.kind !== FILE) {
		return `${row.piece} has the kind "${row.kind}", which is neither "${FILE}" nor "${TOOL_TEXT}"`;
	}
	const handle = bunFile(`${root}/${row.piece}`);
	if (!(await handle.exists())) {
		return `${row.piece} is missing, and its budget of ${row.budget} ${row.measuredAs} holds nothing`;
	}
	const body = await handle.text();
	return row.measuredAs === AS_REQUEST
		? sentRequestChars(body)
		: sentChars(body);
};

/** The fault of one row, or none when the piece is within a budget that names its reading. */
const faultOf = async (
	row: PromptBudget,
	root: string,
): Promise<string | undefined> => {
	if (row.reading === "") {
		return `${row.piece} has a budget of ${row.budget} and no reading`;
	}
	if (!Number.isFinite(row.budget) || row.budget <= 0) {
		return `${row.piece} has no budget figure`;
	}
	if (row.measuredAs !== AS_CHARACTERS && row.measuredAs !== AS_REQUEST) {
		return `${row.piece} is measured as "${row.measuredAs}", which is neither "${AS_CHARACTERS}" nor "${AS_REQUEST}"`;
	}
	const stock = row.kind === TOOL_TEXT ? stockOf(row.piece) : undefined;
	if (stock !== undefined && stock !== row.budget) {
		return `${row.piece} has the budget ${row.budget}, and its stock reading is ${stock}`;
	}
	const sent = await sentOf(row, root);
	if (typeof sent === "string") {
		return sent;
	}
	return sent > row.budget
		? `${row.piece} is ${sent} ${row.measuredAs}, over its budget of ${row.budget} from ${row.reading}`
		: undefined;
};

/**
 * The faults of a budget table, one line per piece. An empty list is a prompt set that may ship. A
 * budget with no reading, a budget whose file is missing, and a budget that disagrees with the stock
 * reading it cites are faults too, because each is a bound that holds nothing.
 */
export const budgetFaults = async (
	budgets: readonly PromptBudget[],
	root = "plugins/claudetto",
): Promise<readonly string[]> => {
	const lines = await Promise.all(
		budgets.map(async (row) => await faultOf(row, root)),
	);
	return lines.filter((line): line is string => line !== undefined);
};
