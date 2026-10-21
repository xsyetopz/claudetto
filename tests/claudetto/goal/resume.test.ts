// The `--budget N%` of a goal counts the growth of the plan percent since the start or the last `/goal resume`.

import { expect, test } from "bun:test";
import { change } from "../../../src/plugins/claudetto/slices/goal/domain/command.ts";
import { nextTurn } from "../../../src/plugins/claudetto/slices/goal/domain/loop.ts";
import {
  createGoal,
  type Goal,
} from "../../../src/plugins/claudetto/slices/goal/domain/state.ts";

const CHECKS = [{ kind: "run", command: "false" } as const];
const FAIL = [{ pass: false, output: "x", at: 0 }];
const goal = (over: Partial<Goal> = {}): Goal => ({
  ...createGoal([{ title: "t", checks: CHECKS }], { budget: { percent: 50 } }),
  ...over,
});
const resumed = (percent: number): Goal =>
  change(goal({ paused: true }), "resume", "", 1, 0, percent).goal as Goal;

test("`resume` takes the plan percent as the base of the budget", () => {
  const out = change(goal({ paused: true }), "resume", "", 1, 0, 60);
  expect(out.goal?.basePercent).toBe(60);
  expect(out.start).toBe(true);
});

test("a resumed goal does not stop at once at the percent that stopped it", () => {
  const out = nextTurn(resumed(60), FAIL, { usd: 0, percent: 62 }, 2);
  expect(out.goal?.paused).toBe(false);
  expect(out.submit).toBeDefined();
});

test("a resumed goal stops when the percent grows by the budget", () => {
  const out = nextTurn(resumed(60), FAIL, { usd: 0, percent: 110 }, 2);
  expect(out.goal?.paused).toBe(true);
});

test("a saved goal with no `basePercent` counts from 0", () => {
  const old = goal();
  delete (old as { basePercent?: number }).basePercent;
  const out = nextTurn(old, FAIL, { usd: 0, percent: 51 }, 2);
  expect(out.goal?.paused).toBe(true);
});

test("a percent below the base means a new window and counts in full", () => {
  const out = nextTurn(
    goal({ basePercent: 80 }),
    FAIL,
    { usd: 0, percent: 10 },
    2,
  );
  expect(out.goal?.paused).toBe(false);
});
