/**
 * Renders rows of cell text as a Markdown table whose first row is the header;
 * short rows are padded to the widest one.
 *
 * @param rows The cell text of each row.
 * @returns The table, or "" when there are no rows.
 */
export function markdownTable(rows: string[][]): string {
	const [first, ...rest] = rows;
	if (first === undefined) {
		return "";
	}
	const width = Math.max(...rows.map((r) => r.length));
	const pad = (r: string[]): string =>
		`| ${[...r, ...Array.from<string>({ length: width - r.length }).fill("")].join(" | ")} |`;
	return [
		pad(first),
		`|${" --- |".repeat(width)}`,
		...rest.map((r) => pad(r))
	].join("\n");
}
