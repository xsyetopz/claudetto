export const whole = (value: number): string =>
	Math.round(value).toLocaleString("en-US");

export const usd = (value: number): string => `$${value.toFixed(2)}`;

export const pct = (value: number): string =>
	`${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(1)}%`;

export const pad = (text: string, width: number): string =>
	text.padStart(width);

export const line = (cells: readonly string[]): void => {
	console.info(`  ${cells.join(" | ")}`);
};

export const head = (title: string): void => {
	console.info(`\n== ${title}`);
};
