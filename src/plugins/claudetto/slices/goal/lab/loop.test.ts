// Lab tests of the `turn.complete` hook of the `goal` slice: the loop of the checks, and one test for each control.
// The stubs hold the state file in memory, run no process, and record each prompt that the hook submits.
// The file is self-contained, because `just generate` copies it to `tests/` of the plugin, where it cannot import a relative file.

import type { On, SessionUsage } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

const FILE = ".claudetto/goal.json";
const OK = {
  exitCode: 0,
  stdout: "",
  stderr: "",
  isStdoutTruncated: false,
  isStderrTruncated: false,
};

/** A goal at step 0, with the fields of `createGoal` and the overrides `over`. */
const goalWith = (over: Record<string, unknown> = {}) => ({
  steps: [
    { title: "build", checks: [{ kind: "run", command: "just check" }] },
    { title: "ship", checks: [{ kind: "file", path: "OUT.md" }] },
  ],
  step: 0,
  results: [],
  turns: 0,
  stalled: 0,
  spentUsd: 0,
  lastUsd: 0,
  paused: false,
  log: [],
  stall: 3,
  ...over,
});

/** What the stubs answer: the exit code and output of `just check`, the usage, and the time. */
type World = {
  exitCode?: number;
  stderr?: string;
  usd?: number;
  percent?: number;
  now?: number;
  /** The value of `CLAUDE_PROJECT_DIR`. */
  root?: string;
};

/** The stubs for the state `goal`, which is the text of the file or `null` for none. They give the file, and the prompts that the hook submitted. */
const stub = (on: On, goal: unknown, world: World = {}) => {
  const file = { text: goal === null ? null : JSON.stringify(goal) };
  const prompts: string[] = [];
  const writes: string[] = [];
  const cwds: (string | undefined)[] = [];
  on("env.get", () => ({ value: world.root }));
  on("turn.complete", (_$, e) => ({ text: e.answer }));
  // Any other file, such as `OUT.md`, exists and holds `out`.
  on("fs.read", (_$, e) => {
    if (!e.path.endsWith(FILE)) return { value: "out" };
    return file.text === null ? { deny: "missing" } : { value: file.text };
  });
  on("fs.write", (_$, e) => {
    writes.push(e.path);
    if (e.path.endsWith(FILE)) file.text = e.text;
    return { value: undefined };
  });
  on("process.run", (_$, e) => {
    cwds.push(e.init?.cwd);
    const exitCode = world.exitCode ?? 1;
    return { value: { ...OK, exitCode, stderr: world.stderr ?? "" } };
  });
  on("session.usage", () => ({
    value: {
      startedAt: 0,
      context: {},
      rateLimits: [{ kind: "five_hour", percentUsed: world.percent ?? 0 }],
      cost: { usd: world.usd ?? 0 },
    } as unknown as SessionUsage,
  }));
  on("clock.now", () => ({ value: world.now ?? 1000 }));
  on("ui.log", () => ({ value: undefined }));
  on("prompt.submit", (_$, e) => {
    prompts.push(e.text);
    return { drop: "test" };
  });
  return {
    prompts,
    writes,
    cwds,
    state: () => (file.text === null ? null : JSON.parse(file.text)),
  };
};

const finish = ($: Engine) =>
  $.turn.complete({
    answer: "Done.",
    durationMs: 1,
    isAborted: false,
    turnId: "t1",
    reason: "answer",
  });

test("with no goal, the turn ends with no check", async ($: Engine, on: On) => {
  const world = stub(on, null);
  await finish($);
  expect(world.prompts).toEqual([]);
});

test("a failing check submits only the failing checks", async ($: Engine, on: On) => {
  const world = stub(on, goalWith(), { stderr: "error: boom" });
  await finish($);
  expect(world.prompts).toHaveLength(1);
  expect(world.prompts[0]).toContain("`just check` exits 0");
  expect(world.prompts[0]).toContain("error: boom");
  expect(world.state().turns).toBe(1);
});

test("when all checks pass, the goal goes to the next step", async ($: Engine, on: On) => {
  const world = stub(on, goalWith(), { exitCode: 0 });
  await finish($);
  expect(world.state().step).toBe(1);
  expect(world.prompts[0]).toContain("ship");
});

test("when the last step passes, the goal is cleared", async ($: Engine, on: On) => {
  const world = stub(on, goalWith({ step: 1 }));
  await finish($);
  expect(world.state()).toBeNull();
  expect(world.prompts).toEqual([]);
});

test("a paused goal does nothing", async ($: Engine, on: On) => {
  const world = stub(on, goalWith({ paused: true }));
  await finish($);
  expect(world.prompts).toEqual([]);
  expect(world.state().turns).toBe(0);
});

test("`maxTurns` stops the goal at the count of turns", async ($: Engine, on: On) => {
  const world = stub(on, goalWith({ maxTurns: 2, turns: 1 }));
  await finish($);
  expect(world.prompts).toEqual([]);
  expect(world.state().paused).toBe(true);
  expect(world.state().log[0].note).toBe("stopped: max-turns");
});

// Runs the turn and checks that the goal stops at its budget.
const stopsAtBudget = async ($: Engine, world: ReturnType<typeof stub>) => {
  await finish($);
  expect(world.prompts).toEqual([]);
  expect(world.state().log[0].note).toBe("stopped: budget");
};

test("`budget` in USD stops the goal at the cost", async ($: Engine, on: On) => {
  const goal = goalWith({ budget: { usd: 2 }, spentUsd: 1, lastUsd: 1 });
  await stopsAtBudget($, stub(on, goal, { usd: 3.5 }));
});

test("`budget` in percent stops the goal at the plan share", async ($: Engine, on: On) => {
  const goal = goalWith({
    budget: { percent: 50 },
    basePercents: { five_hour: 0 },
  });
  await stopsAtBudget($, stub(on, goal, { percent: 51 }));
});

test("`budget` in percent counts no growth at the first turn of a goal with no base", async ($: Engine, on: On) => {
  const world = stub(on, goalWith({ budget: { percent: 10 } }), {
    percent: 60,
  });
  await finish($);
  expect(world.prompts).toHaveLength(1);
  expect(world.state().basePercents).toEqual({ five_hour: 60 });
});

test("`until` stops the goal at the time", async ($: Engine, on: On) => {
  const world = stub(on, goalWith({ until: 900 }), { now: 1000 });
  await finish($);
  expect(world.prompts).toEqual([]);
  expect(world.state().log[0].note).toBe("stopped: until");
});

test("`stall` stops the goal after the same failure in a row", async ($: Engine, on: On) => {
  const world = stub(on, goalWith(), { stderr: "same" });
  await finish($);
  await finish($);
  expect(world.state().stalled).toBe(2);
  expect(world.prompts).toHaveLength(2);
  await finish($);
  expect(world.prompts).toHaveLength(2);
  expect(world.state().log[0].note).toBe("stopped: stall");
});

test("the paths start at the project root, not at the folder of the shell", async ($: Engine, on: On) => {
  const world = stub(on, goalWith(), { root: "/proj" });
  await finish($);
  expect(world.cwds).toEqual(["/proj"]);
  expect(world.writes).toEqual(["/proj/.claudetto/goal.json"]);
});

test("a turn whose checks all pass still stops at `maxTurns`", async ($: Engine, on: On) => {
  const world = stub(on, goalWith({ maxTurns: 1 }), { exitCode: 0 });
  await finish($);
  expect(world.prompts).toEqual([]);
  expect(world.state()).toMatchObject({ step: 1, paused: true });
  expect(world.state().log.at(-1).note).toBe("stopped: max-turns");
});

test("the cost after a `/clear` adds to the spent cost, and does not go below it", async ($: Engine, on: On) => {
  const goal = goalWith({ budget: { usd: 5 }, spentUsd: 1, lastUsd: 10 });
  const world = stub(on, goal, { usd: 2 });
  await finish($);
  expect(world.state()).toMatchObject({
    spentUsd: 3,
    lastUsd: 2,
    paused: false,
  });
});
