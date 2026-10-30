// What a measured arm did, read from the two logs it leaves: the `--debug` output of the session
// and the JSONL that `proxy.ts` writes. The session's own log is the only place that says whether
// the summarizer ran, because `Mu` sends its request with `skipTranscript: !0`, so no transcript
// and no figure derived from one can see it.

/** The counts the session's own `[AgentSummary]` lines give. */
export interface Lines {
	/** Timer ticks: how often the summarizer woke up. */
	fired: number;
	/** `full` mode requests, each the agent's whole context. */
	forked: number;
	/** `short` mode requests, each a bounded set of notes. */
	asked: number;
	/** Ticks the summarizer dropped itself, because the transcript had not changed or was too short. */
	skipped: number;
	/** Ticks it put off because the agent's own prompt cache was likely cold. */
	held: number;
	/** The context of each `full` request, in messages, in the order the requests went out. */
	messages: number[];
}

/**
 * The counts of the `[AgentSummary]` lines of `text`, which may be a pty capture with escape
 * sequences around each line, so each pattern is matched against the whole text and not per line.
 */
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

/** The tokens of one answer, as the API reported them. */
export interface Usage {
	input_tokens?: number;
	output_tokens?: number;
	cache_creation_input_tokens?: number;
	cache_read_input_tokens?: number;
}

/** One line of the proxy's JSONL log. Each field is optional because a line is read as it stands, unchecked. */
export interface Row {
	pid?: number;
	mode?: string;
	event?: string;
	bodyChars?: number;
	/** Whether the answer was the summarizer's, which is what separates its tokens from the arm's. */
	summary?: boolean;
	usage?: Usage;
}

/** Every field of a row is optional, so any object is readable and a number is read where it is one. */
const isRow = (value: unknown): value is Row =>
	typeof value === "object" && value !== null;

/** The rows of a proxy log, skipping a half-written last line, which a killed session can leave. */
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

/** What the proxy saw: the requests it let through, the ones it stopped, and the tokens the first cost. */
export interface Seen {
	/** Whether the proxy started. `0` means the arm measured nothing, whatever else it says. */
	started: number;
	sent: number;
	stopped: number;
	/** The characters of each request body, which is the agent's forked context as it went on the wire. */
	bodyChars: number[];
	/** The context read from the agent's own cache entry, summed over the summarizer's answers. */
	cacheRead: number;
	/** The tokens charged at the full input price, summed over the summarizer's answers. */
	input: number;
	/** The same two sums over every answer of the arm, which is what the summarizer is a share of. */
	armCacheRead: number;
	armInput: number;
	/** Every request that went through the proxy, which says whether it sees the arm's traffic. */
	requests: number;
	/** Answers whose tokens could not be read, which are not answers of zero. */
	unread: number;
}

/** The sum of one field of `usage` over the rows given. */
const sumOf = (rows: Row[], pick: (u: Usage) => number | undefined): number => {
	let total = 0;
	for (const row of rows) {
		total += pick(row.usage ?? {}) ?? 0;
	}
	return total;
};

/** Reduces the proxy log rows to counts: starts, sent and stopped requests, and the summarizer's tokens against those of the whole arm. */
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
