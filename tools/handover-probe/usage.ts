/** The usage object of a Messages response, as far as the probe reads it. */
export interface Usage {
	readonly input_tokens?: number;
	readonly output_tokens: number;
	readonly cache_read_input_tokens: number;
	readonly cache_creation_input_tokens: number;
	readonly cache_creation?: {
		readonly ephemeral_5m_input_tokens: number;
		readonly ephemeral_1h_input_tokens: number;
	};
}

export interface UsageEntry {
	readonly requestId: string;
	readonly usage: Usage;
}

export interface UsageRow {
	readonly requestId: string;
	readonly cacheRead: number;
	readonly write5m: number;
	readonly write1h: number;
	readonly output: number;
}

const rowOf = ({ requestId, usage }: UsageEntry): UsageRow => ({
	requestId,
	cacheRead: usage.cache_read_input_tokens,
	write5m:
		usage.cache_creation?.ephemeral_5m_input_tokens ??
		usage.cache_creation_input_tokens,
	write1h: usage.cache_creation?.ephemeral_1h_input_tokens ?? 0,
	output: usage.output_tokens,
});

/** One row per `requestId`, in first-seen order: a transcript repeats a response's usage once per content block, and a stream's output only grows, so the last entry wins. */
export const usageByRequest = (
	entries: readonly UsageEntry[],
): readonly UsageRow[] => [
	...new Map(entries.map((e) => [e.requestId, rowOf(e)])).values(),
];
