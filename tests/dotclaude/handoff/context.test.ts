// Tests of the report-now note of a subagent (`domain/context.ts`).
// The hook lab cannot mark a `tool.call` as a subagent call, because `ToolCallArgs` drops `agentId`, so the rules are tested here.

import { expect, test } from "bun:test";
import {
  boundFor,
  contextTokens,
  reportNote,
} from "../../../src/plugins/dotclaude/slices/handoff/domain/context.ts";
import {
  HAIKU_CONTEXT_MAX,
  SUBAGENT_CONTEXT_MAX,
} from "../../../src/plugins/dotclaude/slices/handoff/limits.ts";

const MODEL = "claude-sonnet-5-5";

test("a subagent below the context bound gets no note", () => {
  expect(reportNote({ tokens: 10, model: MODEL })).toBeUndefined();
});

test("a subagent over the context bound gets the report-now note", () => {
  const note = reportNote({ tokens: SUBAGENT_CONTEXT_MAX + 1, model: MODEL });
  expect(note).toBeDefined();
  expect(
    reportNote({ tokens: SUBAGENT_CONTEXT_MAX, model: MODEL }),
  ).toBeUndefined();
});

test("a Haiku 5.5 subagent has the lower context bound", () => {
  expect(boundFor("claude-haiku-5-5")).toBe(HAIKU_CONTEXT_MAX);
  expect(boundFor(MODEL)).toBe(SUBAGENT_CONTEXT_MAX);
});

test("the context of a request adds its input, creation, and read tokens", () => {
  expect(
    contextTokens({
      input_tokens: 1,
      cache_creation_input_tokens: 2,
      cache_read_input_tokens: 4,
    }),
  ).toBe(7);
});

test("the Haiku bound is below the 100K prompt-token price step and below the subagent bound", () => {
  expect(HAIKU_CONTEXT_MAX).toBeGreaterThan(0);
  expect(HAIKU_CONTEXT_MAX).toBeLessThan(100_000);
  expect(HAIKU_CONTEXT_MAX).toBeLessThan(SUBAGENT_CONTEXT_MAX);
});
