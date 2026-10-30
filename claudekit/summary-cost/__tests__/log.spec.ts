import { describe, expect, test } from "bun:test";
import { linesOf, rowsOf, seenIn } from "../log.ts";

// The lines as `--debug-file` writes them, each `t(...)` of the summarizer in `chunk-1wgxyh0t.js`.
// A line may carry a prefix or an escape sequence, so no count may depend on a line starting where
// the pattern does.
const capture = `\u001b[2K[AgentSummary] Timer fired for agent agt_1\r
\u001b[2K[AgentSummary] Skipping summary for agt_1: not enough messages (2)\r
[AgentSummary] Timer fired for agent agt_1\r
[AgentSummary] Forking for summary, 14 messages in context\r
[AgentSummary] Timer fired for agent agt_2\r
[AgentSummary] Holding summary for agt_2: the sub-agent's own request has no response yet\r
[AgentSummary] Timer fired for agent agt_2\r
[AgentSummary] Forking for summary, 31 messages in context\r`;

describe("linesOf", () => {
	test("counts the ticks, the requests, and the context of each request", () => {
		const lines = linesOf(capture);

		expect(lines.fired).toBe(4);
		expect(lines.forked).toBe(2);
		expect(lines.messages).toEqual([14, 31]);
		expect(lines.skipped).toBe(1);
		expect(lines.held).toBe(1);
	});

	test("reports no request for a session whose log has no summarizer line", () => {
		const lines = linesOf("[Stall] agent_completion exitPath=done\n");

		expect(lines.fired).toBe(0);
		expect(lines.forked).toBe(0);
		expect(lines.messages).toEqual([]);
	});

	test("counts a `short` mode request, which asks for notes and not for the context", () => {
		const lines = linesOf(
			"[AgentSummary] Asking for summary from 812 characters of notes\n",
		);

		expect(lines.asked).toBe(1);
		expect(lines.forked).toBe(0);
	});
});

describe("rowsOf", () => {
	test("keeps every whole row and drops the half-written last line of a stopped session", () => {
		const text = '{"event":"sent","bodyChars":10}\n{"event":"usa';

		const rows = rowsOf(text);

		expect(rows).toHaveLength(1);
		expect(rows[0]?.bodyChars).toBe(10);
	});
});

describe("seenIn", () => {
	test("sums the tokens the answers were charged and counts each request by kind", () => {
		const rows = rowsOf(`{"event":"sent","bodyChars":40000}
{"event":"usage","summary":true,"usage":{"input_tokens":120,"cache_read_input_tokens":78000}}
{"event":"sent","bodyChars":52000}
{"event":"usage","summary":true,"usage":{"input_tokens":130,"cache_read_input_tokens":91000}}`);

		const seen = seenIn(rows);

		expect(seen.sent).toBe(2);
		expect(seen.stopped).toBe(0);
		expect(seen.cacheRead).toBe(169_000);
		expect(seen.input).toBe(250);
		expect(seen.bodyChars).toEqual([40_000, 52_000]);
	});

	// The summarizer only means something as a share of the arm, which is the claim under test: that
	// it is a large part of the spend of a session that runs agents.
	test("keeps the summarizer's tokens apart from the tokens of the whole arm", () => {
		const rows =
			rowsOf(`{"event":"usage","summary":false,"usage":{"input_tokens":500,"cache_read_input_tokens":20000}}
{"event":"usage","summary":true,"usage":{"input_tokens":10,"cache_read_input_tokens":80000}}`);

		const seen = seenIn(rows);

		expect(seen.cacheRead).toBe(80_000);
		expect(seen.input).toBe(10);
		expect(seen.armCacheRead).toBe(100_000);
		expect(seen.armInput).toBe(510);
	});

	test("an arm the proxy answered itself is charged nothing", () => {
		const rows = rowsOf(
			'{"event":"stopped","bodyChars":40000}\n{"event":"stopped","bodyChars":41000}',
		);

		const seen = seenIn(rows);

		expect(seen.stopped).toBe(2);
		expect(seen.sent).toBe(0);
		expect(seen.cacheRead).toBe(0);
		expect(seen.input).toBe(0);
	});

	// `started` separates "the summarizer made no request" from "the proxy never came up", which are
	// the same row of zeros otherwise, and one round of zeros was the second of the two.
	test("counts the heartbeat of the proxy", () => {
		const rows = rowsOf('{"event":"started","pid":1}\n{"event":"stopped"}');

		const seen = seenIn(rows);

		expect(seen.started).toBe(1);
	});

	test("a log with no heartbeat reports none, so an empty arm is readable as broken", () => {
		expect(seenIn(rowsOf("")).started).toBe(0);
	});

	// A `fetch` wrapper saw 3 requests in a session of about 90 model turns, which is not the session,
	// and an answer whose tokens could not be read is not an answer of zero.
	test("counts every request it saw and every answer it could not read", () => {
		const rows =
			rowsOf(`{"event":"request","summary":false,"path":"/v1/messages"}
{"event":"request","summary":true,"path":"/v1/messages"}
{"event":"unread","summary":true,"why":"TypeError"}
{"event":"no-usage","summary":false,"status":200}`);

		const seen = seenIn(rows);

		expect(seen.requests).toBe(2);
		expect(seen.unread).toBe(2);
	});
});
