// Lab tests of the router: the `prompt.submit` classifier, the `agent.spawn` classifier, and the `turn.step` applier.
// The hooks sit above the stubs of the engine, so the stubs record what the engine would send.

import { expect, mock, test } from "claude-code/testing";

let seq = 0;

/** Stubs for one test: the session, the settings, the env, and the engine side of `agent.spawn` and `turn.step`. */
function stub(on, { env = {}, settings = {} } = {}) {
  const session = `router-${++seq}`;
  const steps = [];
  const spawns = [];
  on("session.id", () => ({ value: session }));
  on("prompt.submit", (_$, e) => ({ text: e.text }));
  on("settings.read", () => ({ value: settings }));
  mock.env(on, env);
  on("agent.spawn", (_$, e) => {
    spawns.push(e);
    return { model: e.model ?? "claude-sonnet-5-5", agentId: `agent-${seq}` };
  });
  on("turn.step", async function* (_$, e) {
    steps.push(e);
    // The stub sends no chunk.
    yield* [];
    return { turnId: e.turnId, index: e.index, answer: "", toolUses: [] };
  });
  return { steps, spawns, agentId: `agent-${seq}` };
}

const spawn = ($, input) => $.agent.spawn({ fork: false, ...input });

const submit = ($, text, kind = "composer") =>
  $.prompt.submit({ text, origin: { kind }, wait: false });

async function step($, input) {
  const stream = $.turn.step(input);
  for await (const _ of stream) {
    // The stub gives no chunk. The loop reads the stream to its end.
  }
  await stream.result;
}

const main = (index, model, effort, turnId = "t1") => ({
  turnId,
  index,
  model,
  effort,
  messageCount: 1 + index,
});

test("main loop: a review prompt sets the effort of the pair on every step of its turn", async ($, on) => {
  const { steps } = stub(on);
  await submit($, "review the diff of the branch");
  // The session effort is `xhigh`, so the pair of the prompt (`high`) is under the cap.
  await step($, main(0, "claude-opus-5-5", "xhigh"));
  await step($, main(1, "claude-opus-5-5", "xhigh"));
  expect(steps.map((s) => [s.model, s.effort])).toEqual([
    ["claude-opus-5-5", "high"],
    ["claude-opus-5-5", "high"],
  ]);
});

test("main loop: the session effort of the step (`--effort low`) caps the routed effort", async ($, on) => {
  const { steps } = stub(on);
  await submit($, "plan the change of the parser");
  await step($, main(0, "claude-opus-5-5", "low"));
  await step($, main(1, "claude-opus-5-5", "low"));
  expect(steps.map((s) => s.effort)).toEqual(["low", "low"]);
});

test("main loop: the lower of `effortLevel` and the effort of the step wins", async ($, on) => {
  const { steps } = stub(on, { settings: { effortLevel: "low" } });
  await submit($, "plan the change of the parser");
  await step($, main(0, "claude-opus-5-5", "xhigh"));
  expect(steps[0].effort).toBe("low");
});

test("main loop: the next turn has no decision and keeps the session values", async ($, on) => {
  const { steps } = stub(on);
  await submit($, "review the diff of the branch");
  await step($, main(0, "claude-opus-5-5", "medium", "t1"));
  await step($, main(0, "claude-opus-5-5", "medium", "t2"));
  expect(steps[1].effort).toBe("medium");
});

test("main loop: a debug prompt keeps the model of the session and changes only the effort", async ($, on) => {
  const { steps } = stub(on);
  await submit($, "the test is flaky, find the root cause");
  // The session effort is `xhigh`, so the effort of the class (`high`) is under the cap.
  await step($, main(0, "claude-sonnet-5-5", "xhigh"));
  expect([steps[0].model, steps[0].effort]).toEqual([
    "claude-sonnet-5-5",
    "high",
  ]);
});

test("main loop: a prompt that is not from the user gets no route", async ($, on) => {
  const { steps } = stub(on);
  await submit($, "review the diff of the branch", "task-notification");
  await step($, main(0, "claude-opus-5-5", "medium"));
  expect(steps[0].effort).toBe("medium");
});

test("main loop: the effort that the user set caps the pair", async ($, on) => {
  const { steps } = stub(on, { settings: { effortLevel: "low" } });
  await submit($, "review the diff of the branch");
  await step($, main(0, "claude-opus-5-5", "low"));
  expect(steps[0].effort).toBe("low");
});

test("subagent: the pair of the task reaches every step of that subagent", async ($, on) => {
  const { steps, spawns, agentId } = stub(on);
  const result = await spawn($, {
    subagentType: "dotclaude:investigator",
    prompt: "Find where the parser is defined.",
    description: "find parser",
  });
  expect(result.agentId).toBe(agentId);
  expect(spawns[0].model).toBe("claude-haiku-5-5");
  const sub = (index) => ({
    ...main(index, "claude-sonnet-5-5", "high", "sub1"),
    agentId,
  });
  await step($, sub(0));
  await step($, sub(1));
  expect(steps.map((s) => [s.model, s.effort])).toEqual([
    ["claude-haiku-5-5", "medium"],
    ["claude-haiku-5-5", "medium"],
  ]);
});

test("subagent: a step of another subagent is not changed", async ($, on) => {
  const { steps } = stub(on);
  await spawn($, {
    subagentType: "dotclaude:investigator",
    prompt: "Find where the parser is defined.",
    description: "find parser",
  });
  await step($, {
    ...main(0, "claude-sonnet-5-5", "high", "sub2"),
    agentId: "other",
  });
  expect(steps[0].model).toBe("claude-sonnet-5-5");
  expect(steps[0].effort).toBe("high");
});

test("subagent: the effort that the user set caps the pair", async ($, on) => {
  const { steps, agentId } = stub(on, { settings: { effortLevel: "low" } });
  await spawn($, {
    subagentType: "dotclaude:reviewer",
    prompt: "Review the change.",
    description: "review",
  });
  await step($, { ...main(0, "claude-sonnet-5-5", "low", "sub3"), agentId });
  expect(steps[0].model).toBe("claude-sonnet-5-5");
  expect(steps[0].effort).toBe("low");
});

test("a fork spawn keeps the model of its parent", async ($, on) => {
  const { spawns } = stub(on);
  await spawn($, {
    subagentType: "fork",
    fork: true,
    prompt: "Find where the parser is defined.",
    description: "find parser",
  });
  expect(spawns[0].model).toBeUndefined();
});

test("an explicit model stays as the `Agent` input set it", async ($, on) => {
  const { spawns, steps, agentId } = stub(on);
  await spawn($, {
    subagentType: "dotclaude:investigator",
    prompt: "Find where the parser is defined.",
    description: "find parser",
    model: "opus",
  });
  expect(spawns[0].model).toBe("opus");
  await step($, { ...main(0, "claude-opus-5-5", "high", "sub4"), agentId });
  expect(steps[0].effort).toBe("high");
});

for (const name of [
  "CLAUDE_CODE_EFFORT_LEVEL",
  "CLAUDE_CODE_SUBAGENT_MODEL_FORCE",
]) {
  test(`\`${name}\` stops the router for the main loop and for a subagent`, async ($, on) => {
    const { spawns, steps, agentId } = stub(on, { env: { [name]: "low" } });
    await submit($, "review the diff of the branch");
    await step($, main(0, "claude-opus-5-5", "medium"));
    await spawn($, {
      subagentType: "dotclaude:investigator",
      prompt: "Find where the parser is defined.",
      description: "find parser",
    });
    await step($, { ...main(0, "claude-sonnet-5-5", "high", "sub5"), agentId });
    expect(spawns[0].model).toBeUndefined();
    expect(steps.map((s) => [s.model, s.effort])).toEqual([
      ["claude-opus-5-5", "medium"],
      ["claude-sonnet-5-5", "high"],
    ]);
  });
}

test("the prompt block of a routed spawn is the block of the routed model", async ($, on) => {
  const { spawns } = stub(on);
  await spawn($, {
    subagentType: "dotclaude:investigator",
    prompt: "Find where the parser is defined.",
    description: "find parser",
  });
  expect(spawns[0].prompt.startsWith("Find where the parser is defined.")).toBe(
    true,
  );
  expect(spawns[0].prompt.length).toBeGreaterThan(
    "Find where the parser is defined.".length,
  );
});
