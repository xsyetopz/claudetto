// Lab tests of the soft turn limit of `prompt` (task 19.10): a subagent at the bound of its type gets one `additionalContext` line, a subagent below it gets none, and the main thread gets none.
// The stubs answer the engine beneath the plugin, and no model runs.

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import {
  STATE_TRIES_MAX,
  TURN_BOUNDS,
} from "../modules/session/prompt/limits.ts";
import { TURN_LIMIT_LINE } from "../modules/session/prompt/prompts.ts";
import { stubState } from "./stubs/process.ts";

const TYPE = "claudetto:Athena";
const BOUND = TURN_BOUNDS[TYPE] as number;

const stub = (on: On, store = new Map<string, unknown>()): void => {
  stubState(on, store);
  on("classic.PostToolUse", () => ({}));
  on("classic.PostToolUseFailure", () => ({}));
  on("classic.SubagentStop", () => ({}));
};

/** The lines that `calls` tool calls of one agent add, in order. */
const lines = async (
  $: Engine,
  calls: number,
  agent?: { id: string; type: string },
): Promise<string[][]> => {
  const out: string[][] = [];
  for (let i = 0; i < calls; i++)
    out.push(
      (
        await $.classic.PostToolUse({
          tool_name: "Read",
          tool_input: { file_path: "/proj/a.ts" },
          tool_response: {},
          tool_use_id: `t${i}`,
          ...(agent ? { agent_id: agent.id, agent_type: agent.type } : {}),
        })
      ).additionalContext ?? [],
    );
  return out;
};

test("Subagent at the Bound", async ($: Engine, on: On) => {
  stub(on);
  const out = await lines($, BOUND + 5, { id: "a1", type: TYPE });
  const given = out.flatMap((l, i) => (l.length ? [i + 1] : []));
  expect(given).toStrictEqual([BOUND]);
  expect(out[BOUND - 1]?.length).toBe(1);
  expect(out[BOUND - 1]?.[0]?.split("\n").length).toBe(1);
});

test("Subagent Below the Bound", async ($: Engine, on: On) => {
  stub(on);
  const out = await lines($, BOUND - 1, { id: "a1", type: TYPE });
  expect(out.flat()).toStrictEqual([]);
});

test("Main Thread", async ($: Engine, on: On) => {
  stub(on);
  const out = await lines($, BOUND + 5);
  expect(out.flat()).toStrictEqual([]);
});

test("Count of Each Agent", async ($: Engine, on: On) => {
  stub(on);
  await lines($, BOUND - 1, { id: "a1", type: TYPE });
  const other = await lines($, BOUND - 1, { id: "a2", type: TYPE });
  expect(other.flat()).toStrictEqual([]);
});

test("Unknown Type", async ($: Engine, on: On) => {
  stub(on);
  const out = await lines($, 500, { id: "a1", type: "custom" });
  expect(out.flat().length).toBe(1);
});

const stop = ($: Engine) =>
  $.classic.SubagentStop({
    agent_id: "a1",
    agent_type: TYPE,
    agent_transcript_path: "/t",
    last_assistant_message: "",
    stop_hook_active: false,
  });

test("Count Cleared at Subagent Stop", async ($: Engine, on: On) => {
  stub(on);
  await lines($, BOUND - 1, { id: "a1", type: TYPE });
  await stop($);
  const again = await lines($, BOUND - 1, { id: "a1", type: TYPE });
  expect(again.flat()).toStrictEqual([]);
});

test("Line Again after Subagent Stop", async ($: Engine, on: On) => {
  stub(on);
  await lines($, BOUND, { id: "a1", type: TYPE });
  await stop($);
  const again = await lines($, BOUND, { id: "a1", type: TYPE });
  expect(again.flat().length).toBe(1);
});

test("Count Jumps over the Bound", async ($: Engine, on: On) => {
  const store = new Map<string, unknown>([["calls", { a1: BOUND + 2 }]]);
  stub(on, store);
  const out = await lines($, 3, { id: "a1", type: TYPE });
  expect(out.map((l) => l.length)).toStrictEqual([1, 0, 0]);
});

const fail = ($: Engine) =>
  $.classic.PostToolUseFailure({
    tool_name: "Read",
    tool_input: { file_path: "/proj/a.ts" },
    tool_use_id: "f1",
    error: "no such file",
    agent_id: "a1",
    agent_type: TYPE,
  } as never);

test("Failed Call at the Bound", async ($: Engine, on: On) => {
  stub(on);
  await lines($, BOUND - 1, { id: "a1", type: TYPE });
  const failed = await fail($);
  expect(failed.additionalContext?.length).toBe(1);
});

test("Failed Call Below the Bound", async ($: Engine, on: On) => {
  stub(on);
  const failed = await fail($);
  expect(failed.additionalContext ?? []).toStrictEqual([]);
});

test("Failed Call Counts", async ($: Engine, on: On) => {
  stub(on);
  await lines($, BOUND - 2, { id: "a1", type: TYPE });
  const failed = await fail($);
  const next = await lines($, 1, { id: "a1", type: TYPE });
  const given = [failed.additionalContext ?? [], ...next].flat();
  expect(given.length).toBe(1);
});

/** Keeps the state with versions, as the engine does: a `state.set` with a stale `ifVersion` is not set. `onGet` runs after each `state.get` answered, and stands for a write of another agent that lands before the next `state.set`. */
const versioned = (
  on: On,
  store: Map<string, { value: unknown; version: number }>,
  onGet: () => void = () => {},
): void => {
  on("state.get", (_$, e) => {
    const held = store.get(e.key) ?? { value: undefined, version: 0 };
    const answer = { value: { ...held } };
    onGet();
    return answer;
  });
  on("state.set", (_$, e) => {
    const held = store.get(e.key) ?? { value: undefined, version: 0 };
    if (e.ifVersion !== undefined && e.ifVersion !== held.version)
      return { value: { isSet: false, version: held.version } };
    store.set(e.key, { value: e.value, version: held.version + 1 });
    return { value: { isSet: true, version: held.version + 1 } };
  });
  on("classic.PostToolUse", () => ({}));
  on("classic.PostToolUseFailure", () => ({}));
  on("classic.SubagentStop", () => ({}));
};

test("Stop Keeps a Write of Another Agent", async ($: Engine, on: On) => {
  const store = new Map([
    ["calls", { value: { a1: 3, a2: BOUND - 1 }, version: 1 }],
  ]);
  let raced = false;
  versioned(on, store, () => {
    if (raced) return;
    raced = true;
    store.set("calls", {
      value: { a1: 3, a2: -BOUND },
      version: 2,
    });
  });
  await stop($);
  const kept = store.get("calls")?.value;
  const again = await lines($, 1, { id: "a2", type: TYPE });
  expect(kept).toStrictEqual({ a2: -BOUND });
  expect(again.flat()).toStrictEqual([]);
});

test("State That Never Sets Gives the Line", async ($: Engine, on: On) => {
  let gets = 0;
  on("state.get", () => {
    gets++;
    return { value: { value: undefined, version: 0 } };
  });
  on("state.set", () => ({ value: { isSet: false, version: 1 } }));
  on("classic.PostToolUse", () => ({}));
  const out = await lines($, 1, { id: "a1", type: TYPE });
  expect(out.flat()).toStrictEqual([TURN_LIMIT_LINE]);
  expect(gets).toBe(STATE_TRIES_MAX);
});

test("State Set That Throws Gives the Line", async ($: Engine, on: On) => {
  on("state.get", () => ({ value: { value: undefined, version: 0 } }));
  on("state.set", () => ({ deny: "state is down" }));
  on("classic.PostToolUse", () => ({}));
  const out = await lines($, 1, { id: "a1", type: TYPE });
  expect(out.flat()).toStrictEqual([TURN_LIMIT_LINE]);
});

test("Stop of an Unknown Agent Writes Nothing", async ($: Engine, on: On) => {
  let sets = 0;
  class Counted extends Map<string, unknown> {
    override set(key: string, value: unknown) {
      sets++;
      return super.set(key, value);
    }
  }
  const store = new Counted();
  store.set("calls", { a2: 3 });
  sets = 0;
  stub(on, store);
  await stop($);
  expect(sets).toBe(0);
  expect(store.get("calls")).toStrictEqual({ a2: 3 });
});

test("Stop That Loses Every Try Ends with no Fault", async ($: Engine, on: On) => {
  let sets = 0;
  on("state.get", () => ({ value: { value: { a1: 3 }, version: 0 } }));
  on("state.set", () => {
    sets++;
    return { value: { isSet: false, version: 1 } };
  });
  on("classic.SubagentStop", () => ({}));
  const answer = await stop($);
  expect(answer).toStrictEqual({});
  expect(sets).toBe(STATE_TRIES_MAX);
});

test("Late Call after a Stop Counts from One", async ($: Engine, on: On) => {
  stub(on);
  await lines($, BOUND, { id: "a1", type: TYPE });
  await stop($);
  const late = await lines($, 1, { id: "a1", type: TYPE });
  const rest = await lines($, BOUND - 2, { id: "a1", type: TYPE });
  const bound = await lines($, 1, { id: "a1", type: TYPE });
  expect([late, rest].flat(2)).toStrictEqual([]);
  expect(bound.flat()).toStrictEqual([TURN_LIMIT_LINE]);
});

test("State That Throws Gives the Line Once", async ($: Engine, on: On) => {
  on("state.get", () => ({ deny: "state is down" }));
  on("state.set", () => ({ deny: "state is down" }));
  on("classic.PostToolUse", () => ({}));
  const out = await lines($, 30, { id: "down", type: TYPE });
  expect(out.flat()).toStrictEqual([TURN_LIMIT_LINE]);
});

test("State That Recovers Gives the Line Once in Total", async ($: Engine, on: On) => {
  let isDown = true;
  let held: unknown;
  let version = 0;
  on("state.get", () =>
    isDown ? { deny: "state is down" } : { value: { value: held, version } },
  );
  on("state.set", (_$, e) => {
    held = e.value;
    version++;
    return { value: { isSet: true, version } };
  });
  on("classic.PostToolUse", () => ({}));
  const first = await lines($, 1, { id: "flaky", type: TYPE });
  isDown = false;
  const rest = await lines($, BOUND + 2, { id: "flaky", type: TYPE });
  expect(first.flat()).toStrictEqual([TURN_LIMIT_LINE]);
  expect(rest.flat()).toStrictEqual([]);
});
