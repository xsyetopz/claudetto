// Tests of the report-now note at the turn limit of each agent: the note of `handoff/domain/context.ts` with the bound of `TURNS_LEFT_AT`.
// The hook lab cannot mark a `tool.call` as a subagent call, so the timing is tested here, with the turn bound of each agent.

import { expect, test } from "bun:test";
import {
  AGENT_NAMES,
  turnBound,
} from "../../../src/plugins/dotclaude/slices/agents/domain/turns.ts";
import { reportNote } from "../../../src/plugins/dotclaude/slices/handoff/domain/context.ts";
import { TURNS_LEFT_AT } from "../../../src/plugins/dotclaude/slices/handoff/limits.ts";

const MODEL = "claude-sonnet-5-5";

test("each agent gets the note when `TURNS_LEFT_AT` turns are left", () => {
  for (const agent of AGENT_NAMES) {
    const turns = turnBound(agent) - TURNS_LEFT_AT;
    const note = reportNote({ tokens: 10, model: MODEL, turns }, agent);
    expect(note, agent).toBeDefined();
  }
});

// A commit of the work takes two turns, and the report takes one turn.
// The note must come with three turns left, or a run ends at its limit with no report.
const COMMIT_AND_REPORT_TURNS = 3;

test("each agent gets the note with turns left for a commit and a report", () => {
  for (const agent of AGENT_NAMES) {
    const turns = turnBound(agent) - TURNS_LEFT_AT;
    const before = reportNote(
      { tokens: 10, model: MODEL, turns: turns - 1 },
      agent,
    );
    expect(before, agent).toBeUndefined();
    expect(turnBound(agent) - turns, agent).toBeGreaterThanOrEqual(
      COMMIT_AND_REPORT_TURNS,
    );
  }
});
