// Scores and the Markdown summary of the claim-check run. A summary holds case ids and numbers, never case text. The engine loads this module, so it uses no Bun or node API.
import type { Usage } from "./claim-check-prices.ts";

/** What one road found for one case. */
export interface Row {
	readonly id: string;
	readonly expected: readonly string[];
	readonly found: readonly string[];
}

/** One request's measured numbers. */
export interface Call {
	readonly label: string;
	readonly limit: number;
	readonly output: number;
	readonly cacheRead: number;
	readonly ms: number;
	readonly limitMs: number;
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
	readonly calls: readonly Call[];
	readonly jev: JevStats;
	readonly tokens: ReadonlyMap<string, Usage>;
	readonly usd: number;
	readonly stopped: boolean;
	/** Why the run stopped at a model call that gave no answer, else `undefined`. */
	readonly failure: string | undefined;
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

const largest = (calls: readonly Call[], label: string): string => {
	const mine = calls.filter((call) => call.label === label);
	const top = mine.toSorted((a, b) => b.output - a.output)[0];
	return top === undefined
		? `- ${label}: no request.`
		: `- ${label}: largest \`output_tokens\` ${top.output} against ${top.limit} as the worst case, over ${mine.length} requests; ${mine.filter((call) => call.ms > call.limitMs).length} took longer than their \`timeoutMs\`.`;
};

const cacheLine = (calls: readonly Call[]): string => {
	const later = calls
		.filter((call) => call.label === "decider-fallback")
		.slice(1)
		.map((call) => call.cacheRead);
	return later.length === 0
		? "- No fallback request after the first."
		: `- \`cache_read_input_tokens\` of each fallback request after the first: ${later.join(", ")}.`;
};

const tokenSection = (tokens: ReadonlyMap<string, Usage>): string[] => [
	"## Tokens by Model",
	"",
	"| model | input | output | cache read | cache write |",
	"| --- | --- | --- | --- | --- |",
	...[...tokens].map(
		([model, t]) =>
			`| ${model} | ${t.input_tokens} | ${t.output_tokens} | ${t.cache_read_input_tokens} | ${t.cache_creation_input_tokens} |`,
	),
	"",
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
		f.failure ??
			(f.stopped
				? "The run stopped before a request that could pass the cap."
				: "The run finished every case."),
		`The run is billed to the subscription's weekly limit, which counts tokens. API list-price equivalent: $${f.usd.toFixed(4)}. Log lines: ${f.logLines}.`,
		"",
		...[...f.roads].flatMap(([name, road]) => roadSection(name, road)),
		...tokenSection(f.tokens),
		"## Usage",
		"",
		cacheLine(f.calls),
		...[...new Set(f.calls.map((call) => call.label))].map((label) =>
			largest(f.calls, label),
		),
		"",
		...jevSection(f.jev),
		...f.extra,
	].join("\n");

const tokenLine = (tokens: ReadonlyMap<string, Usage>): string =>
	[...tokens]
		.map(
			([model, t]) =>
				`${model} in ${t.input_tokens} out ${t.output_tokens} cache-read ${t.cache_read_input_tokens} cache-write ${t.cache_creation_input_tokens}`,
		)
		.join(" | ") || "none";

/** The last line of a run. */
export const finalLine = (f: Findings): string =>
	`${f.failure === undefined ? "" : `${f.failure} `}tokens ${tokenLine(f.tokens)}; API list-price equivalent $${f.usd.toFixed(4)}; cases scored: ${[...f.roads].map(([name, road]) => `${name} ${road.rows.length}`).join(", ")}`;
