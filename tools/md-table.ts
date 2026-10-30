// A check that reads the page holds its figures where a person reads them, so a figure cannot drift
// from the reading it came from without the check saying so.

const SEPARATOR = /^-+$/;
const TICKS = /^`(.*)`$/;
const LEADING_PIPE = /^\|/;
const TRAILING_PIPE = /\|\s*$/;

/** A cell without its code ticks, which a page writes around a path, a name, or a value. */
export const bare = (cell: string): string => TICKS.exec(cell)?.[1] ?? cell;

/** The lines of the first Markdown table under `heading`, or none when the page has no such table. */
const tableLines = (page: string, heading: string): readonly string[] => {
	const lines = page.split("\n");
	const at = lines.indexOf(heading);
	if (at < 0) {
		return [];
	}
	const rows: string[] = [];
	for (const line of lines.slice(at + 1)) {
		if (line.startsWith("|")) {
			rows.push(line);
		} else if (rows.length > 0 || line.startsWith("#")) {
			// The next heading ends the section, so a section with no table of its own reads as empty
			// rather than taking the rows of a later section.
			break;
		}
	}
	return rows;
};

/** The trimmed cells of one table row. */
const cellsOf = (line: string): readonly string[] =>
	line
		.replace(LEADING_PIPE, "")
		.replace(TRAILING_PIPE, "")
		.split("|")
		.map((cell) => cell.trim());

/**
 * The data rows of the first table under `heading`, each as its trimmed cells. The header row and
 * the separator row are not data, and prose between the heading and the table is skipped.
 */
export const tableRows = (
	page: string,
	heading: string,
): readonly (readonly string[])[] =>
	tableLines(page, heading)
		.map(cellsOf)
		.slice(1)
		.filter((cells) => !cells.every((cell) => SEPARATOR.test(cell)));
