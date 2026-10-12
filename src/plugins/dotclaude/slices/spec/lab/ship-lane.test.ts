// The hook lab of the lane hooks of the `spec` slice: `claude plugin test plugins/dotclaude` fires `agent.spawn` and `turn.complete` with stubs.
// No subagent starts, no command runs, and no model call goes out.
// The stub of `process.run` is the test's own, so the live `dotclaude-spec lane` and its refusal in a worktree are not tested here.

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

const BRIEF = "---\nid: P33\ndeps: [P19]\n---\n\n# P33 Zero token cost";

/** The stubs of one test: the engine answers the spawn, and `process.run` lists each `lane` call. */
const stub = (on: On, agentId = "a1", exitCode = 0) => {
  const lanes: string[] = [];
  on("agent.spawn", () => ({ model: "claude-sonnet-5-5", agentId }));
  on("turn.complete", (_$, e) => ({ text: e.answer }));
  on("process.run", (_$, e) => {
    lanes.push(e.argv.slice(3).join(" "));
    return {
      value: {
        exitCode,
        stdout: "",
        stderr: exitCode === 0 ? "" : "lane refused",
        isStdoutTruncated: false,
        isStderrTruncated: false,
      },
    };
  });
  return lanes;
};

const spawn = ($: Engine, prompt: string, subagentType = "implementer") =>
  $.agent.spawn({
    tool_use_id: "u1",
    prompt,
    description: "a package",
    subagentType,
    provider: { plugin: "dotclaude", tier: "user" },
    parentModel: "claude-sonnet-5-5",
    background: false,
    fork: false,
  });

const end = (
  $: Engine,
  agentId: string,
  reason: "answer" | "aborted" | "error" = "answer",
) =>
  $.turn.complete({
    answer: "done",
    durationMs: 1,
    isAborted: reason === "aborted",
    turnId: "t",
    reason,
    agentId,
  });

test("the spawn of an implementer moves its package to `doing`", async ($: Engine, on: On) => {
  const lanes = stub(on);
  await spawn($, BRIEF);
  expect(lanes).toEqual(["lane P33 doing"]);
});

test("a spawn with no brief in its prompt moves no lane", async ($: Engine, on: On) => {
  const lanes = stub(on);
  await spawn($, "Read the files.");
  expect(lanes).toEqual([]);
});

test("a spawn of another agent type moves no lane", async ($: Engine, on: On) => {
  const lanes = stub(on);
  await spawn($, BRIEF, "reviewer");
  expect(lanes).toEqual([]);
});

test("the end of an implementer moves its package to `review`", async ($: Engine, on: On) => {
  const lanes = stub(on);
  await spawn($, BRIEF);
  await end($, "a1");
  expect(lanes).toEqual(["lane P33 doing", "lane P33 review"]);
});

test("the end of another subagent moves no lane", async ($: Engine, on: On) => {
  const lanes = stub(on);
  await spawn($, BRIEF);
  await end($, "other");
  expect(lanes).toEqual(["lane P33 doing"]);
});

test("an aborted or errored subagent leaves its lane `doing` and logs it", async ($: Engine, on: On) => {
  const lanes = stub(on);
  const logs: string[] = [];
  on("ui.log", (_$, e, next) => {
    logs.push(e.text);
    return next(e);
  });
  await spawn($, BRIEF);
  await end($, "a1", "aborted");
  await spawn($, BRIEF.replace("P33", "P34"));
  await end($, "a1", "error");
  expect(lanes).toEqual(["lane P33 doing", "lane P34 doing"]);
  expect(logs.length).toBe(2);
});

test("a prompt that quotes `id: P12` in its body moves no lane", async ($: Engine, on: On) => {
  const lanes = stub(on);
  await spawn($, "Read the brief.\nid: P12\nThen stop.");
  await spawn($, "---\ntitle: x\n---\nid: P12");
  expect(lanes).toEqual([]);
});

test("a `lane` run that exits 1 is logged", async ($: Engine, on: On) => {
  stub(on, "a1", 1);
  const logs: string[] = [];
  on("ui.log", (_$, e, next) => {
    logs.push(e.text);
    return next(e);
  });
  await spawn($, BRIEF);
  expect(logs.some((t) => t.includes("lane refused"))).toBe(true);
});
