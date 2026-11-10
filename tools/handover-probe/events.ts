import type { LogRecord } from "./server.ts";

export interface Event {
	/** A handoff call and the clear it starts, a built-in compaction (its summarizer request), or a forked handover (its fork request). */
	readonly type: "clear" | "compaction" | "handover";
	/** The server's request number. */
	readonly n: number;
	/** The request's place in the log. */
	readonly index: number;
	/** FAKE context tokens of the request that marks the event. */
	readonly tokens: number;
}

const typeOf = (r: LogRecord): Event["type"] | undefined => {
	if (r.calledHandoff) {
		return "clear";
	}
	if (r.kind === "summarizer") {
		return "compaction";
	}
	return r.kind === "fork" ? "handover" : undefined;
};

export const eventsOf = (records: readonly LogRecord[]): readonly Event[] =>
	records.flatMap((r, index) => {
		const type = typeOf(r);
		return type === undefined
			? []
			: [{ type, n: r.n, index, tokens: r.contextTokens }];
	});
