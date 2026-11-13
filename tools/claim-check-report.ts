// Scores and the Markdown summary of the claim-check run. A summary holds case ids and numbers, never case text. The engine loads this module, so it uses no Bun or node API.
/** What one road found for one case. */
export interface Row {
	readonly id: string;
	readonly expected: readonly string[];
	readonly found: readonly string[];
}

/** What the Jev requests showed. */
export interface JevStats {
	requests: number;
	refused: number;
	nouls: number;
	banded: number;
	maxChars: number;
	maxTokens: number | undefined;
	usageKeys: Set<string>;
}

/** The numbers a run collected. */
export interface Findings {
	readonly title: string;
	/** Markdown lines a run adds after its roads. */
	readonly extra: readonly string[];
	readonly roads: ReadonlyMap<
		string,
		{ scope: readonly string[] | undefined; rows: Row[] }
	>;
	readonly jev: JevStats;
	readonly logLines: number;
}

const share = (part: number, whole: number): string =>
	whole === 0 ? "n/a" : `${((100 * part) / whole).toFixed(1)}%`;

const inScope = (
	codes: readonly string[],
	scope: readonly string[],
): string[] => codes.filter((code) => scope.includes(code)).toSorted();

const sameSet = (a: readonly string[], b: readonly string[]): boolean =>
	a.length === b.length && a.every((code, i) => code === b[i]);

const exactTable = (
	scope: readonly string[] | undefined,
	rows: readonly Row[],
): string[] => {
	const missed = rows.filter((row) => !matches(scope, row));
	return [
		`Exact match: ${rows.length - missed.length} of ${rows.length} (${share(rows.length - missed.length, rows.length)}).`,
		`Missed ids: ${missed.map((row) => row.id).join(", ") || "none"}.`,
	];
};

const codeTable = (
	scope: readonly string[],
	rows: readonly Row[],
): string[] => [
	"| code | precision | recall | true pos | false pos | false neg |",
	"| --- | --- | --- | --- | --- | --- |",
	...scope.map((code) => {
		const found = rows.filter((row) => row.found.includes(code));
		const real = rows.filter((row) => row.expected.includes(code));
		const tp = found.filter((row) => row.expected.includes(code)).length;
		return `| ${code} | ${share(tp, found.length)} | ${share(tp, real.length)} | ${tp} | ${found.length - tp} | ${real.length - tp} |`;
	}),
];

/** Whether a row's found codes equal its expected codes within `scope`; with no scope, all codes count. */
export const matches = (
	scope: readonly string[] | undefined,
	row: Row,
): boolean =>
	scope === undefined
		? sameSet(row.expected.toSorted(), row.found.toSorted())
		: sameSet(inScope(row.expected, scope), inScope(row.found, scope));

const roadSection = (
	name: string,
	road: { scope: readonly string[] | undefined; rows: Row[] },
): string[] => [
	`## ${name.charAt(0).toUpperCase()}${name.slice(1)}`,
	"",
	`Cases scored: ${road.rows.length}.`,
	...exactTable(road.scope, road.rows),
	"",
	...(road.scope === undefined
		? []
		: [...codeTable(road.scope, road.rows), ""]),
];

const jevSection = (jev: JevStats): string[] => [
	"## Jev",
	"",
	`- Requests: ${jev.requests}, of which ${jev.refused} did not answer 200.`,
	`- Largest state Jev accepted: ${jev.maxChars} characters, ${jev.maxTokens === undefined ? "tokens not reported by the response" : `${jev.maxTokens} tokens`}.`,
	`- Response \`usage\` keys seen: ${[...jev.usageKeys].join(", ") || "none"}.`,
	`- Nouls between the two thresholds: ${jev.banded} of ${jev.nouls} (${share(jev.banded, jev.nouls)}).`,
	"",
];

/** The Markdown summary of a run. */
export const summary = (f: Findings): string =>
	[
		`# ${f.title}`,
		"",
		`The run finished every case. Log lines: ${f.logLines}.`,
		"",
		...[...f.roads].flatMap(([name, road]) => roadSection(name, road)),
		...jevSection(f.jev),
		...f.extra,
	].join("\n");

/** The last line of a run. */
export const finalLine = (f: Findings): string =>
	`cases scored: ${[...f.roads].map(([name, road]) => `${name} ${road.rows.length}`).join(", ")}`;
