// Tests of the hooks of the `agents` slice: the report-now note one time, and the write scope of the `planner`.
// The lab cannot give an `agentId` to `$.tool.call`, so these tests call the handlers with a stub of the engine.

import { expect, test } from "bun:test";
import type { EngineInterface } from "claude-code";
import {
  onToolCall,
  onTurnStep,
} from "../../../plugins/claudetto/slices/agents/adapters/mod.ts";
import {
  HAIKU_CONTEXT_MAX,
  SUBAGENT_CONTEXT_MAX,
} from "../../../plugins/claudetto/slices/agents/limits.ts";

/** The stub of the engine: the agent list and the working folder. */
const engine = (agents: { id: string; type: string }[]): EngineInterface =>
  ({
    agent: { list: async () => agents },
    session: { cwd: async () => "/p" },
  }) as unknown as EngineInterface;

/** Runs one `turn.step` of the agent `agentId` that ends with `tokens` of context on `model`. */
const step = async (
  agentId: string | undefined,
  tokens: number,
  model: string,
) => {
  const next = async function* () {
    yield* [];
    return {
      usage: {
        input_tokens: tokens,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
        output_tokens: 1,
        model,
      },
    };
  };
  const e = { turnId: "t", index: 0, model, messageCount: 1, agentId };
  const gen = (onTurnStep as unknown as (...a: unknown[]) => AsyncGenerator)(
    engine([]),
    e,
    next,
  );
  for (;;) if ((await gen.next()).done) return;
};

/** Runs one `tool.call` of `tool` with `file_path`, in the agent `agentId`, over a tool that answers `ok`. */
const call = async (
  agents: { id: string; type: string }[],
  agentId: string | undefined,
  tool: string,
  file?: string,
) => {
  const next = async () =>
    ({ result: "ok" }) as {
      result: string;
      context?: string[];
      deny?: undefined;
    };
  const e = { tool, tool_use_id: "u", agentId, file_path: file };
  return await (
    onToolCall as unknown as (...a: unknown[]) => Promise<{
      deny?: string;
      context?: string[];
    }>
  )(engine(agents), e, next);
};

const WORKER = [{ id: "w", type: "claudetto:investigator" }];
const PLANNER = [{ id: "p", type: "claudetto:planner" }];

test("a step of the main loop keeps no state", async () => {
  await step(undefined, SUBAGENT_CONTEXT_MAX * 3, "claude-opus-5-5");
  expect((await call(WORKER, undefined, "Bash")).context).toBeUndefined();
});

test("a step of a subagent keeps its context", async () => {
  await step("w", SUBAGENT_CONTEXT_MAX + 1, "claude-sonnet-5-5");
  expect((await call(WORKER, "w", "Bash")).context?.[0]).toContain(
    String(SUBAGENT_CONTEXT_MAX + 1),
  );
});

test("a subagent in its bound gets no note", async () => {
  await step("in-bound", SUBAGENT_CONTEXT_MAX, "claude-sonnet-5-5");
  const out = await call([{ id: "in-bound", type: "x" }], "in-bound", "Bash");
  expect(out.context).toBeUndefined();
});

test("a Haiku 5.5 subagent gets the note at its lower bound", async () => {
  await step("h", HAIKU_CONTEXT_MAX + 1, "claude-haiku-5-5");
  const out = await call([{ id: "h", type: "x" }], "h", "Bash");
  expect(out.context?.[0]).toContain(`${HAIKU_CONTEXT_MAX} tokens`);
});

test("a subagent over its bound gets the note one time in 10 calls", async () => {
  const agents = [{ id: "many", type: "x" }];
  await step("many", SUBAGENT_CONTEXT_MAX + 5, "claude-sonnet-5-5");
  let notes = 0;
  for (let i = 0; i < 10; i++)
    if ((await call(agents, "many", "Bash")).context) notes++;
  expect(notes).toBe(1);
});

test("a new step over the bound after the note gives no second note", async () => {
  const agents = [{ id: "again", type: "x" }];
  await step("again", SUBAGENT_CONTEXT_MAX + 5, "claude-sonnet-5-5");
  await call(agents, "again", "Bash");
  await step("again", SUBAGENT_CONTEXT_MAX + 9, "claude-sonnet-5-5");
  expect((await call(agents, "again", "Bash")).context).toBeUndefined();
});

test("the planner write outside the change folder is denied", async () => {
  for (const file of [
    "/p/src/a.ts",
    "/p/minispec/changes/x/../../../src/a.ts",
    "/p/minispec/specs/a/spec.md",
    "/p/minispec/changes/a.md",
    "/etc/passwd",
    "./src/a.ts",
    "./minispec/changes/x/../../src/a.ts",
  ])
    for (const tool of ["Write", "Edit"])
      expect(
        typeof (await call(PLANNER, "p", tool, file)).deny,
        `${tool} ${file}`,
      ).toBe("string");
});

test("the planner write inside the change folder is allowed", async () => {
  for (const file of [
    "/p/minispec/changes/add-x/proposal.md",
    "minispec/changes/add-x/specs/a/spec.md",
    "./minispec/changes/add-x/proposal.md",
    "/p/./minispec/changes/add-x/proposal.md",
    "minispec//changes/add-x/./proposal.md",
  ])
    expect(
      (await call(PLANNER, "p", "Write", file)).deny,
      file,
    ).toBeUndefined();
});

test("the planner `Read` and a write of another agent are not denied", async () => {
  expect(
    (await call(PLANNER, "p", "Read", "/p/src/a.ts")).deny,
  ).toBeUndefined();
  expect(
    (await call(WORKER, "w", "Write", "/p/src/a.ts")).deny,
  ).toBeUndefined();
});
