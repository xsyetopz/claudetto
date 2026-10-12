// The hook lab of the lane hooks of the `spec` slice: `claude plugin test plugins/dotclaude` fires `agent.spawn` and `turn.complete` with stubs.
// No subagent starts, no command runs, and no model call goes out.
// The stub of `process.run` is the test's own, so the live `dotclaude-spec lane` and its refusal in a worktree are not tested here.

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

const BRIEF = "---\nid: P33\ndeps: [P19]\n---\n\n# P33 Zero token cost";

/** The stubs of one test: the engine answers the spawn, and `process.run` lists each `lane` call. */
const stub = (on: On, agentId = "a1") => {
  const lanes: string[] = [];
  on("agent.spawn", () => ({ model: "claude-sonnet-5-5", agentId }));
  on("turn.complete", (_$, e) => ({ text: e.answer }));
  on("process.run", (_$, e) => {
    lanes.push(e.argv.slice(3).join(" "));
    return {
      value: {
        exitCode: 0,
        stdout: "",
        stderr: "",
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

const end = ($: Engine, agentId: string) =>
  $.turn.complete({
    answer: "done",
    durationMs: 1,
    isAborted: false,
    turnId: "t",
    reason: "answer",
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
