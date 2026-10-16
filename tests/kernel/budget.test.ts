// Tests that pin the handoff trigger bounds of `src/kernel/budget.ts` to the values of the handoff spec.

import { expect, test } from "bun:test";
import {
  CONTEXT_BLOCK_MARGIN,
  CONTEXT_WINDOW,
  HAIKU_HANDOFF_TRIGGER_TOKENS,
  HANDOFF_TRIGGER_TOKENS,
} from "../../src/kernel/budget.ts";

test("the trigger of Opus, Sonnet, and Fable is 225,000 tokens", () => {
  expect(HANDOFF_TRIGGER_TOKENS).toBe(225_000);
});

test("the trigger of Haiku is 100,000 tokens", () => {
  expect(HAIKU_HANDOFF_TRIGGER_TOKENS).toBe(100_000);
});

test("each trigger is below the client block limit", () => {
  const block = CONTEXT_WINDOW - CONTEXT_BLOCK_MARGIN;
  expect(HANDOFF_TRIGGER_TOKENS).toBeLessThan(block);
  expect(HAIKU_HANDOFF_TRIGGER_TOKENS).toBeLessThan(block);
});
