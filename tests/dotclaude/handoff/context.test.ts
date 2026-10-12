// Tests of the report-now note of a subagent (`domain/context.ts`).
// The hook lab cannot mark a `tool.call` as a subagent call, because `ToolCallArgs` drops `agentId`, so the rules are tested here.

import { expect, test } from "bun:test";
import {
  AGENT_NAMES,
  turnBound,
} from "../../../src/plugins/dotclaude/slices/agents/domain/turns.ts";
import {
  boundFor,
  contextTokens,
  maxTurnsOf,
  reportNote,
} from "../../../src/plugins/dotclaude/slices/handoff/domain/context.ts";
import {
  AGENT_MAX_TURNS,
  HAIKU_CONTEXT_MAX,
  SUBAGENT_CONTEXT_MAX,
  TURNS_LEFT_AT,
} from "../../../src/plugins/dotclaude/slices/handoff/limits.ts";

const MODEL = "claude-sonnet-5-5";

test("a subagent below both bounds gets no note", () => {
  expect(
    reportNote({ tokens: 10, model: MODEL, turns: 1 }, "investigator"),
  ).toBeUndefined();
});

test("a subagent over the context bound gets the report-now note", () => {
  const note = reportNote(
    { tokens: SUBAGENT_CONTEXT_MAX + 1, model: MODEL, turns: 1 },
    "investigator",
  );
  expect(note).toBeDefined();
  expect(
    reportNote(
      { tokens: SUBAGENT_CONTEXT_MAX, model: MODEL, turns: 1 },
      "investigator",
    ),
  ).toBeUndefined();
});

test("a subagent that nears its turn limit gets the note", () => {
  const max = AGENT_MAX_TURNS["investigator"] as number;
  const at = (turns: number) =>
    reportNote({ tokens: 10, model: MODEL, turns }, "dotclaude:investigator");
  expect(at(max - TURNS_LEFT_AT)).toBeDefined();
  expect(at(max - TURNS_LEFT_AT - 1)).toBeUndefined();
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

test("`maxTurnsOf` reads a type with or without the `dotclaude:` prefix and gives undefined for another type", () => {
  const max = AGENT_MAX_TURNS["implementer"];
  expect(maxTurnsOf("implementer")).toBe(max);
  expect(maxTurnsOf("dotclaude:implementer")).toBe(max);
  expect(maxTurnsOf("free")).toBeUndefined();
  expect(maxTurnsOf("toString")).toBeUndefined();
  expect(maxTurnsOf(undefined)).toBeUndefined();
});

test("the table of `maxTurns` is the turn bound of each agent, and `TURNS_LEFT_AT` is below the smallest", () => {
  expect(Object.keys(AGENT_MAX_TURNS).sort()).toStrictEqual([...AGENT_NAMES]);
  for (const name of AGENT_NAMES)
    expect(maxTurnsOf(name), name).toBe(turnBound(name));
  expect(TURNS_LEFT_AT).toBeGreaterThan(0);
  expect(TURNS_LEFT_AT).toBeLessThan(
    Math.min(...Object.values(AGENT_MAX_TURNS)),
  );
});

test("the Haiku bound is below the 100K prompt-token price step and below the subagent bound", () => {
  expect(HAIKU_CONTEXT_MAX).toBeGreaterThan(0);
  expect(HAIKU_CONTEXT_MAX).toBeLessThan(100_000);
  expect(HAIKU_CONTEXT_MAX).toBeLessThan(SUBAGENT_CONTEXT_MAX);
});
