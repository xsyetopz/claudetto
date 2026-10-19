// Lab tests of the commands of the `goal` slice: `/goal` and its words, and the built-in parts that the slice turns off.
// The stubs hold the state file in memory and record each prompt that the hooks submit.
// The file is self-contained, because `just generate` copies it to `tests/` of the plugin, where it cannot import a relative file.

import type { On, SessionUsage } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

const FILE = ".claudetto/goal.json";

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

/** The stubs for the state `goal` (the text of the file, or `null` for none). They give the file and the prompts that the hooks submitted. */
const stub = (on: On, goal: unknown = null, isWriteFailing = false) => {
  const file = { text: goal === null ? null : JSON.stringify(goal) };
  const prompts: string[] = [];
  on("command.run", (_$, e) => ({ text: `core ${e.command}` }));
  on("fs.read", (_$, e) => {
    if (e.path.endsWith("NOPE.md")) return { deny: "missing" };
    if (!e.path.endsWith(FILE)) {
      return { value: "## 1. Build\n- Check: `just check`\n## 2. Ship" };
    }
    return file.text === null ? { deny: "missing" } : { value: file.text };
  });
  on("fs.write", (_$, e) => {
    if (isWriteFailing) throw new Error("disk full");
    if (e.path.endsWith(FILE)) file.text = e.text;
    return { value: undefined };
  });
  on("session.usage", () => ({
    value: {
      startedAt: 0,
      context: {},
      rateLimits: [],
      cost: { usd: 1 },
    } as unknown as SessionUsage,
  }));
  on("env.get", () => ({ value: "/proj" }));
  on("clock.now", () => ({ value: 1000 }));
  on("clock.after", () => ({ value: undefined }));
  on("session.messages", () => ({ value: [] }));
  on("prompt.submit", (_$, e) => {
    prompts.push(e.text);
    return { drop: "test" };
  });
  return {
    prompts,
    state: () => (file.text === null ? null : JSON.parse(file.text)),
  };
};

/** `/command args`, and then the timer after the hook. */
const typed = async ($: Engine, command: string, args = "") => {
  const out = await $.command.run({
    command,
    args,
    origin: { kind: "composer" },
    presentation: { isFullscreen: false, columns: 80 },
  });
  await new Promise((resolve) => setTimeout(resolve, 20));
  return out;
};

test("another command runs unchanged", async ($: Engine, on: On) => {
  stub(on);
  expect((await typed($, "compact")).text).toBe("core compact");
});

test("the built-in `/goal` does not run, and the hook answers", async ($: Engine, on: On) => {
  stub(on);
  expect((await typed($, "goal", "status")).text).toBe("No goal.");
});

// biome-ignore lint/plugin: a test name
test("a condition with commands in backticks makes a goal of `run` checks, and the first turn starts", async ($: Engine, on: On) => {
  const world = stub(on);
  await typed($, "goal", "`just check` and `ls` --max-turns 4 --budget $2");
  expect(world.state().steps[0].checks).toEqual([
    { kind: "run", command: "just check" },
    { kind: "run", command: "ls" },
  ]);
  expect(world.state()).toMatchObject({
    maxTurns: 4,
    budget: { usd: 2 },
    lastUsd: 1,
  });
  expect(world.prompts[0]).toContain("step 1");
});

// biome-ignore lint/plugin: a test name
test("a failing hook still answers, and the built-in `/goal` does not run", async ($: Engine, on: On) => {
  stub(on, goalWith(), true);
  const out = await typed($, "goal", "clear");
  expect(out.text).toContain("Goal:");
  expect(out.text).not.toContain("core");
});

test("a control word inside a condition is a condition", async ($: Engine, on: On) => {
  const world = stub(on);
  await typed($, "goal", "clear the cache with `just x`");
  expect(world.state().steps[0].title).toBe("clear the cache with `just x`");
});

test("a bad flag value gives an error line and no goal", async ($: Engine, on: On) => {
  const world = stub(on);
  const out = await typed($, "goal", "x --stall 0");
  expect(out.text).toContain("--stall");
  expect(world.state()).toBeNull();
});

test("a plan file that is missing gives a line that says so", async ($: Engine, on: On) => {
  stub(on);
  const out = await typed($, "goal", "NOPE.md");
  expect(out.text).toContain("was not found");
});

test("`resume` of a goal that is not paused changes nothing", async ($: Engine, on: On) => {
  const world = stub(on, goalWith({ turns: 2 }));
  const out = await typed($, "goal", "resume");
  expect(out.text).toContain("not paused");
  expect(world.state().turns).toBe(2);
});

// biome-ignore lint/plugin: a test name
test("`resume` of a goal with a budget takes the cost of the session as its base", async ($: Engine, on: On) => {
  const world = stub(
    on,
    goalWith({ paused: true, budget: { usd: 9 }, lastUsd: 50 }),
  );
  await typed($, "goal", "resume");
  expect(world.state().lastUsd).toBe(1);
});

test("a condition with no command makes one `judge` check", async ($: Engine, on: On) => {
  const world = stub(on);
  await typed($, "goal", "the docs name the flag");
  expect(world.state().steps[0].checks).toEqual([
    { kind: "judge", claim: "the docs name the flag" },
  ]);
});

test("a file that ends in `.md` gives the steps of the plan", async ($: Engine, on: On) => {
  const world = stub(on);
  await typed($, "goal", "PLAN.md --stall 2");
  expect(world.state().steps.map((s: { title: string }) => s.title)).toEqual([
    "Build",
    "Ship",
  ]);
  expect(world.state().stall).toBe(2);
});

test("`clear` removes the goal", async ($: Engine, on: On) => {
  const world = stub(on, goalWith());
  await typed($, "goal", "clear");
  expect(world.state()).toBeNull();
});

test("`pause` keeps the goal, and `resume` starts the turn again", async ($: Engine, on: On) => {
  const world = stub(on, goalWith());
  await typed($, "goal", "pause");
  expect(world.state().paused).toBe(true);
  expect(world.prompts).toEqual([]);
  await typed($, "goal", "resume");
  expect(world.state().paused).toBe(false);
  expect(world.prompts).toHaveLength(1);
});

// biome-ignore lint/plugin: a test name
test("`resume` counts the turns, the cost, and the stall from the resume", async ($: Engine, on: On) => {
  const goal = goalWith({
    paused: true,
    turns: 5,
    maxTurns: 5,
    spentUsd: 9,
    stalled: 2,
  });
  const world = stub(on, goal);
  await typed($, "goal", "resume");
  expect(world.state()).toMatchObject({
    turns: 0,
    spentUsd: 0,
    stalled: 0,
    paused: false,
  });
});

// biome-ignore lint/plugin: a test name
test("`skip` and `step N` move the step and write a line to the log", async ($: Engine, on: On) => {
  const world = stub(on, goalWith());
  await typed($, "goal", "skip");
  expect(world.state()).toMatchObject({
    step: 1,
    log: [{ note: "Skipped step 1" }],
  });
  await typed($, "goal", "step 1");
  expect(world.state().step).toBe(0);
  expect(world.state().log).toHaveLength(2);
  expect((await typed($, "goal", "step 9")).text).toContain("from 1 to 2");
});

test("`skip` on the last step ends the goal", async ($: Engine, on: On) => {
  const world = stub(on, goalWith({ step: 1 }));
  await typed($, "goal", "skip");
  expect(world.state()).toBeNull();
});

// biome-ignore lint/plugin: a test name
test("`status` shows the step, each check with its last result, and the budget, with no turn", async ($: Engine, on: On) => {
  const world = stub(
    on,
    goalWith({
      budget: { usd: 3 },
      spentUsd: 1,
      results: [{ pass: false, output: "x", at: 1 }],
    }),
  );
  const text = (await typed($, "goal", "status")).text;
  expect(text).toContain("step 1 of 2");
  expect(text).toContain("`just check` exits 0: fail");
  expect(text).toContain("cost $1.00 of $3");
  expect(world.prompts).toEqual([]);
});

test("another tool call passes", async ($: Engine, on: On) => {
  on("tool.call", () => ({ result: "ok" }));
  const out = await $.tool.call({ tool: "Read", file_path: "a.txt" });
  expect("deny" in out).toBe(false);
});

test("`ProposeGoal` is denied with a text that names `/goal`", async ($: Engine, on: On) => {
  on("tool.call", () => ({ result: "ok" }));
  on("session.messages", () => ({ value: [] }));
  on("session.cwd", () => ({ value: "/p" }));
  on("fs.exists", () => ({ value: false }));
  const out = await $.tool.call({ tool: "ProposeGoal", condition: "x" });
  expect("deny" in out && out.deny).toContain("/goal");
});

test("the attachment `goal_status` is left out", async ($: Engine, on: On) => {
  on("prompt.attachment", () => ({ text: "kept" }));
  const out = await $.prompt.attachment({ type: "goal_status" } as never);
  expect(out.text).toBeNull();
});

const describeCommand = ($: Engine, on: On, command: string) => {
  on("command.describe", (_$, e) => ({
    description: e.description,
    isHidden: e.isHidden,
  }));
  return $.command.describe({
    command,
    description: "Set a goal that Claude works toward.",
    isHidden: false,
    immediate: false,
    provider: { plugin: "engine", tier: "core" },
  });
};

test("`/goal` has the goal engine text", async ($: Engine, on: On) => {
  const out = await describeCommand($, on, "goal");
  expect(out.description).toContain("check");
  expect(out.isHidden).toBe(false);
});

test("`command.describe` leaves another command unchanged", async ($: Engine, on: On) => {
  const out = await describeCommand($, on, "help");
  expect(out.description).toBe("Set a goal that Claude works toward.");
});
