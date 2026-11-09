import type { LogRecord } from "./server.ts";

/** A main request record whose usage is `n` times a fixed amount, so a test can tell the records apart. */
export const rec = (n: number, over: Partial<LogRecord>): LogRecord => ({
	n,
	path: "/v1/messages",
	host: "127.0.0.1:1",
	requestId: `req_${n}`,
	kind: "main",
	calledHandoff: false,
	contextTokens: 50_000,
	toolNames: [],
	lastUserText: "",
	cacheControlTtls: [],
	usage: {
		output_tokens: n,
		cache_read_input_tokens: n * 100,
		cache_creation_input_tokens: n * 10,
		cache_creation: {
			ephemeral_5m_input_tokens: n * 10,
			ephemeral_1h_input_tokens: 0,
		},
	},
	...over,
});
