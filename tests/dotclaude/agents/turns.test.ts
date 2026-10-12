// Tests of the turn bound of a subagent: `domain/turns.ts` of the `agents` slice.

import { expect, test } from "bun:test";
import {
  AGENT_NAMES,
  turnBound,
  withinTurnBound,
} from "../../../src/plugins/dotclaude/slices/agents/domain/turns.ts";

test("each agent has a whole-number turn bound of at least one", () => {
  expect(AGENT_NAMES.length).toBe(7);
  for (const agent of AGENT_NAMES) {
    const bound = turnBound(agent);
    expect(Number.isInteger(bound), agent).toBe(true);
    expect(bound, agent).toBeGreaterThanOrEqual(1);
  }
});

test("`withinTurnBound` allows the counts from one to the bound, and no other", () => {
  for (const agent of AGENT_NAMES) {
    const bound = turnBound(agent);
    expect(withinTurnBound(agent, 1), agent).toBe(true);
    expect(withinTurnBound(agent, bound), agent).toBe(true);
    expect(withinTurnBound(agent, bound + 1), agent).toBe(false);
    expect(withinTurnBound(agent, 0), agent).toBe(false);
    expect(withinTurnBound(agent, 1.5), agent).toBe(false);
  }
});
