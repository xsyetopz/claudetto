import type { Usage } from "../api/forward.ts";
export interface Lines {
	fired: number;
	forked: number;
	asked: number;
	skipped: number;
	held: number;
	messages: number[];
}

/** Matches the whole text, because a pty capture has escape sequences around each line. */
export const linesOf = (text: string): Lines => {
	const count = (pattern: RegExp): number => (text.match(pattern) ?? []).length;
	const forked = [
		...text.matchAll(/\[AgentSummary] Forking for summary, (\d+) messages/g),
	];
	return {
		fired: count(/\[AgentSummary] Timer fired/g),
		forked: forked.length,
		asked: count(/\[AgentSummary] Asking for summary from/g),
		skipped: count(/\[AgentSummary] Skipping summary for/g),
		held: count(/\[AgentSummary] Holding summary for/g),
		messages: forked.map((m) => Number(m[1])),
	};
};

export type { Usage } from "../api/forward.ts";

export interface Row {
	pid?: number;
	mode?: string;
	event?: string;
	bodyChars?: number;
	summary?: boolean;
	usage?: Usage;
}

const isRow = (value: unknown): value is Row =>
	typeof value === "object" && value !== null;

export const rowsOf = (text: string): Row[] =>
	text
		.split("\n")
		.filter((line) => line.startsWith("{"))
		.flatMap((line): Row[] => {
			try {
				const parsed: unknown = JSON.parse(line);
				return isRow(parsed) ? [parsed] : [];
			} catch {
				return [];
			}
		});

export interface Seen {
	started: number;
	sent: number;
	stopped: number;
	bodyChars: number[];
	cacheRead: number;
	input: number;
	armCacheRead: number;
	armInput: number;
	requests: number;
	unread: number;
}

const sumOf = (rows: Row[], pick: (u: Usage) => number | undefined): number => {
	let total = 0;
	for (const row of rows) {
		total += pick(row.usage ?? {}) ?? 0;
	}
	return total;
};

export const seenIn = (rows: Row[]): Seen => {
	const of = (event: string): Row[] => rows.filter((r) => r.event === event);
	const usages = of("usage");
	const summaries = usages.filter((r) => r.summary === true);
	return {
		started: of("started").length,
		sent: of("sent").length,
		stopped: of("stopped").length,
		bodyChars: [...of("sent"), ...of("stopped")].map((r) => r.bodyChars ?? -1),
		cacheRead: sumOf(summaries, (u) => u.cache_read_input_tokens),
		input: sumOf(summaries, (u) => u.input_tokens),
		armCacheRead: sumOf(usages, (u) => u.cache_read_input_tokens),
		armInput: sumOf(usages, (u) => u.input_tokens),
		requests: of("request").length,
		unread: of("unread").length + of("no-usage").length,
	};
};
