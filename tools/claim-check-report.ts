// Scores and the Markdown summary of `decider-claim-check.ts`. A summary holds case ids and numbers, never case text.

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
	readonly roads: ReadonlyMap<
		string,
		{ scope: readonly string[]; rows: Row[] }
	>;
	readonly calls: readonly Call[];
	readonly jev: JevStats;
	readonly usd: number;
	readonly stopped: boolean;
	readonly unread: number;
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
	scope: readonly string[],
	rows: readonly Row[],
): string[] => {
	const missed = rows.filter(
		(row) => !sameSet(inScope(row.expected, scope), inScope(row.found, scope)),
	);
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
	"|---|---|---|---|---|---|",
	...scope.map((code) => {
		const found = rows.filter((row) => row.found.includes(code));
		const real = rows.filter((row) => row.expected.includes(code));
		const tp = found.filter((row) => row.expected.includes(code)).length;
		return `| ${code} | ${share(tp, found.length)} | ${share(tp, real.length)} | ${tp} | ${found.length - tp} | ${real.length - tp} |`;
	}),
];

const roadSection = (
	name: string,
	road: { scope: readonly string[]; rows: Row[] },
): string[] => [
	`## ${name}`,
	"",
	`Cases scored: ${road.rows.length}.`,
	...exactTable(road.scope, road.rows),
	"",
	...codeTable(road.scope, road.rows),
	"",
];

const largest = (calls: readonly Call[], label: string): string => {
	const mine = calls.filter((call) => call.label === label);
	const top = mine.toSorted((a, b) => b.output - a.output)[0];
	return top === undefined
		? `- ${label}: no request.`
		: `- ${label}: largest \`output_tokens\` ${top.output} against ${top.limit} sent as \`max_tokens\` (\`maxTokens\` + 2,048), over ${mine.length} requests; ${mine.filter((call) => call.ms > call.limitMs).length} took longer than their \`timeoutMs\`.`;
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
		"# Claim-check run",
		"",
		f.stopped
			? "The run stopped before a request that could pass the cap."
			: "The run finished every case.",
		`Total cost: $${f.usd.toFixed(4)} (Anthropic requests only). Answers that did not parse: ${f.unread}. Log lines: ${f.logLines}.`,
		"",
		...[...f.roads].flatMap(([name, road]) => roadSection(name, road)),
		"## Usage",
		"",
		cacheLine(f.calls),
		...["haiku", "sonnet", "decider-fallback"].map((label) =>
			largest(f.calls, label),
		),
		"",
		...jevSection(f.jev),
	].join("\n");

/** The last line of a run. */
export const finalLine = (f: Findings): string =>
	`total cost $${f.usd.toFixed(4)}; cases scored: ${[...f.roads].map(([name, road]) => `${name} ${road.rows.length}`).join(", ")}`;
