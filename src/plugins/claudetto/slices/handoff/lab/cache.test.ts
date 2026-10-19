// Lab tests of the handoff on a cold and on a warm cache (task 3.11, D47).
// A compaction after the cache TTL of a root session, 1 hour, writes the handoff with no model call.
// A compaction on a warm cache forks the cached prefix.

import type { On, SessionMessage } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { CACHE_TTL_MS } from "../limits.ts";

const HOUR = 3_600_000;
const NO_USAGE = {
  input_tokens: 0,
  output_tokens: 0,
  cache_read_input_tokens: 0,
  cache_creation_input_tokens: 0,
};

const MESSAGES: SessionMessage[] = [
  { role: "user", text: "Build the export.", toolUses: [], handle: "h0" },
  { role: "assistant", text: "Done.", toolUses: [], handle: "h1" },
  { role: "user", text: "Use `csv`, not JSON.", toolUses: [], handle: "h2" },
  { role: "assistant", text: "Ok.", toolUses: [], handle: "h3" },
];

/** The stubs, and what the hooks did: the forks, the writes, and the clock that the test moves. */
const engine = (on: On) => {
  const seen = { forks: 0, writes: [] as string[], now: 0 };
  on("clock.now", () => ({ value: seen.now }));
  on("session.surfaces", () => ({ value: [] }));
  on("session.model", () => ({ value: "claude-haiku-5-5" }));
  on("model.fork", () => {
    seen.forks++;
    return {
      value: { isAnswered: true, text: "- Read `a.txt`.", usage: NO_USAGE },
    };
  });
  on("fs.write", (_$, e) => {
    seen.writes.push(e.text);
    return { value: undefined };
  });
  on("fs.stat", () => ({
    value: { kind: "file", size: 100, mtimeMs: 0, isLink: false },
  }));
  on("turn.complete", (_$, e) => ({ text: e.answer }));
  on("turn.step", async function* (_$, e) {
    yield* [];
    return {
      turnId: e.turnId,
      index: e.index,
      answer: "",
      toolUses: [],
      stopReason: "end_turn" as const,
      usage: null,
    };
  });
  on("session.compact", () => ({ skip: "the built-in compaction" }));
  return seen;
};

const finish = ($: Engine) =>
  $.turn.complete({
    answer: "Ok.",
    durationMs: 1,
    isAborted: false,
    turnId: "t1",
    reason: "answer",
  });

const compact = ($: Engine) =>
  $.session.compact({ trigger: "auto", messages: MESSAGES });

const step = async ($: Engine, agentId?: string) => {
  const stream = $.turn.step({
    turnId: "t1",
    index: 0,
    model: "claude-haiku-5-5",
    messageCount: 1,
    ...(agentId === undefined ? {} : { agentId }),
  });
  for await (const _chunk of stream);
};

// This test runs first: the module keeps the time of the last turn, and here no turn was seen in the process.
// biome-ignore lint/plugin: a test name
test("a compaction after a resume, with no turn seen in the process, is cold", async ($: Engine, on: On) => {
  const seen = engine(on);
  await compact($);
  expect(seen.forks).toBe(0);
  expect(seen.writes[0]).toContain("> Use `csv`, not JSON.");
});

test("the TTL of a root session is 1 hour", () => {
  expect(CACHE_TTL_MS).toBe(HOUR);
});

// biome-ignore lint/plugin: a test name
test("a compaction after the cache TTL writes the handoff with no model call", async ($: Engine, on: On) => {
  const seen = engine(on);
  await finish($);
  seen.now = HOUR + 1;
  const result = await compact($);
  expect(seen.forks).toBe(0);
  expect(seen.writes).toHaveLength(1);
  expect(seen.writes[0]).toContain("Build the export.");
  expect(seen.writes[0]).toContain("> Use `csv`, not JSON.");
  expect(result.messages?.[0]?.text).toContain("Build the export.");
});

test("a compaction on a warm cache forks the cached prefix", async ($: Engine, on: On) => {
  const seen = engine(on);
  await finish($);
  seen.now = HOUR - 1;
  const result = await compact($);
  expect(seen.forks).toBe(1);
  expect(seen.writes[0]).toContain("- Read `a.txt`.");
  expect(result.messages).toBeDefined();
});

// biome-ignore lint/plugin: a test name
test("a model request of the main thread in a long turn keeps the cache warm", async ($: Engine, on: On) => {
  const seen = engine(on);
  await finish($);
  seen.now = HOUR - 1;
  await step($);
  seen.now = 2 * HOUR - 2;
  await compact($);
  expect(seen.forks).toBe(1);
});

// biome-ignore lint/plugin: a test name
test("a model request of a subagent does not keep the cache warm", async ($: Engine, on: On) => {
  const seen = engine(on);
  await finish($);
  seen.now = HOUR - 1;
  await step($, "a1");
  seen.now = 2 * HOUR - 2;
  await compact($);
  expect(seen.forks).toBe(0);
});
