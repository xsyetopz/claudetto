// Tests of the request sizing of `dotclaude-capture`: the bound of the parts, the HTTP 429 retry, and a failed part.
// A fake `count_tokens` server answers each call, and a fake wait records the delays, so no test sleeps.

import { expect, test } from "bun:test";
import {
  sizeRequest,
  sizingLines,
} from "../../../src/plugins/dotclaude-lab/slices/capture/domain/report.ts";
import type {
  Body,
  Wait,
} from "../../../src/plugins/dotclaude-lab/slices/capture/domain/types.ts";
import {
  COUNT_ATTEMPTS,
  COUNT_BACKOFF_MS,
  MAX_PART_COUNTS,
} from "../../../src/plugins/dotclaude-lab/slices/capture/limits.ts";

/** The reply of the fake server to one call: its status and its body text. */
type Reply = { status: number; text: string };

/**
 * A fake `count_tokens` endpoint. `plan(n)` gives the reply to call `n`, from 1.
 * The default reply counts the characters of the request body as tokens.
 * `calls` holds the body text of each call.
 */
const countServer = (plan: (n: number) => Reply | null = () => null) => {
  const calls: string[] = [];
  const server = Bun.serve({
    port: 0,
    hostname: "127.0.0.1",
    async fetch(req) {
      const text = await req.text();
      calls.push(text);
      const special = plan(calls.length);
      if (special)
        return new Response(special.text, { status: special.status });
      return Response.json({ input_tokens: text.length });
    },
  });
  return {
    calls,
    url: `http://127.0.0.1:${server.port}`,
    stop: () => server.stop(true),
  };
};

/** A fake wait: it records each delay and returns at once. */
const fakeWait = () => {
  const delays: number[] = [];
  const wait: Wait = async (ms) => {
    delays.push(ms);
  };
  return { delays, wait };
};

/** A request with one tool for each of `count` tools, and one message. */
const toolsRequest = (count: number): Body => ({
  model: "m",
  tools: Array.from({ length: count }, (_, i) => ({ name: `tool${i}` })),
  messages: [{ role: "user", content: "hello" }],
});

test("a request with more parts than the bound counts only the parts inside it", async () => {
  const up = countServer();
  try {
    const sizing = await sizeRequest(
      up.url,
      toolsRequest(MAX_PART_COUNTS + 6),
      {},
      "",
      fakeWait().wait,
    );
    // One call for the full request, then one call for each counted part.
    expect(up.calls.length).toBe(1 + MAX_PART_COUNTS);
    expect(sizing.rows.length).toBe(MAX_PART_COUNTS + 6);
    const counted = sizing.rows.slice(0, MAX_PART_COUNTS);
    const past = sizing.rows.slice(MAX_PART_COUNTS);
    expect(counted.every((r) => typeof r.tokens === "number")).toBe(true);
    expect(past.every((r) => r.tokens === null && r.note !== null)).toBe(true);
    // The parts past the bound do not add to the parts, so the rest holds them.
    expect(sizing.parts).toBe(
      counted.reduce((sum, r) => sum + (r.tokens ?? 0), 0),
    );
    expect(sizing.rest).toBe(sizing.full - sizing.parts);
  } finally {
    up.stop();
  }
});

test("an HTTP 429 is retried with a doubling wait until the count succeeds", async () => {
  // Calls 1 and 2 answer 429, so the full count takes two waits and then succeeds.
  const up = countServer((n) =>
    n <= 2 ? { status: 429, text: '{"error":"rate"}' } : null,
  );
  const { delays, wait } = fakeWait();
  try {
    const sizing = await sizeRequest(up.url, toolsRequest(1), {}, "", wait);
    expect(delays).toStrictEqual([COUNT_BACKOFF_MS, COUNT_BACKOFF_MS * 2]);
    expect(up.calls.length).toBe(3 + 1);
    expect(sizing.full).toBe((up.calls[2] ?? "").length);
    expect(typeof sizing.rows[0]?.tokens).toBe("number");
  } finally {
    up.stop();
  }
});

test("a part that keeps answering 429 gives up after the attempts of the bound", async () => {
  // Call 1 is the full count and succeeds. Every later call is a part, and each one answers 429.
  const up = countServer((n) =>
    n === 1 ? null : { status: 429, text: '{"error":"rate"}' },
  );
  const { delays, wait } = fakeWait();
  try {
    const sizing = await sizeRequest(up.url, toolsRequest(1), {}, "", wait);
    expect(up.calls.length).toBe(1 + COUNT_ATTEMPTS);
    expect(delays).toStrictEqual(
      Array.from(
        { length: COUNT_ATTEMPTS - 1 },
        (_, k) => COUNT_BACKOFF_MS * 2 ** k,
      ),
    );
    expect(sizing.rows[0]?.tokens).toBeNull();
    expect(sizing.rows[0]?.note).toContain("count_tokens 429");
  } finally {
    up.stop();
  }
});

test("one part that fails does not fail the whole report", async () => {
  // Call 1 is the full count, call 2 is the first part, and call 2 fails with HTTP 500.
  const up = countServer((n) =>
    n === 2 ? { status: 500, text: '{"error":"boom"}' } : null,
  );
  const { delays, wait } = fakeWait();
  try {
    const sizing = await sizeRequest(up.url, toolsRequest(3), {}, "", wait);
    expect(sizing.rows.length).toBe(3);
    const [failed, ...others] = sizing.rows;
    expect(failed?.tokens).toBeNull();
    expect(failed?.note).toContain("count failed");
    expect(others.every((r) => typeof r.tokens === "number")).toBe(true);
    expect(sizing.parts).toBe(others.reduce((s, r) => s + (r.tokens ?? 0), 0));
    // A 500 is not retried, so no wait happens.
    expect(delays).toStrictEqual([]);
    // The failed part prints last, with `?` for its tokens and the header counts it.
    const lines = sizingLines("n", sizing);
    expect(lines[0]).toContain("1 parts not counted");
    expect(lines.at(-1)?.trimStart().startsWith("?")).toBe(true);
  } finally {
    up.stop();
  }
});

test("a 200 reply whose body is not JSON never gives a count, for the full count or a part", async () => {
  // Every call answers 200 with HTML, so no count can be read from any reply.
  const html = { status: 200, text: "<html>proxy page</html>" };
  const up = countServer(() => html);
  const { wait } = fakeWait();
  try {
    await expect(
      sizeRequest(up.url, toolsRequest(1), {}, "", wait),
    ).rejects.toThrow();
  } finally {
    up.stop();
  }
  // A part that gets the same reply after a good full count has no count.
  const part = countServer((n) => (n === 1 ? null : html));
  try {
    const sizing = await sizeRequest(part.url, toolsRequest(1), {}, "", wait);
    expect(sizing.rows[0]?.tokens).toBeNull();
    expect(sizing.parts).toBe(0);
  } finally {
    part.stop();
  }
});
