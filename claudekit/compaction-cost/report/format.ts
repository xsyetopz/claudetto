// The printing primitives that both report modules write their tables with.

/** A number rounded to a whole and grouped by thousands in the `en-US` style. */
export const whole = (value: number): string =>
	Math.round(value).toLocaleString("en-US");

/** Dollars to two decimals, with a leading dollar sign. */
export const usd = (value: number): string => `$${value.toFixed(2)}`;

/** A signed percent to one decimal, with a true minus sign for a negative value. */
export const pct = (value: number): string =>
	`${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(1)}%`;

/** Right-aligns `text` in a column of `width` characters; a longer text is left whole. */
export const pad = (text: string, width: number): string =>
	text.padStart(width);

/** One row of a table, indented under its heading. */
export const line = (cells: readonly string[]): void => {
	console.info(`  ${cells.join(" | ")}`);
};

/** The heading of a table. */
export const head = (title: string): void => {
	console.info(`\n== ${title}`);
};
