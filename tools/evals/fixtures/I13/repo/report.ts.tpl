export interface Row {
	readonly name: string;
	readonly count: number;
}

export interface Summary {
	readonly rows: readonly Row[];
	readonly total: number;
}

const ROWS: readonly Row[] = [
	{ name: "open", count: 4 },
	{ name: "closed", count: 9 },
];

export const summarize = (rows: readonly Row[]): Summary => ({
	rows,
	total: rows.reduce((sum, row) => sum + row.count, 0),
});

export const render = (summary: Summary): string =>
	[
		...summary.rows.map((row) => `${row.name}: ${row.count}`),
		`total: ${summary.total}`,
	].join("\n");

if (import.meta.main) {
	console.info(render(summarize(ROWS)));
}
