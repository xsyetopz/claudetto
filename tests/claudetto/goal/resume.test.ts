// The `--budget N%` of a goal counts the highest growth of one plan limit since the start or the last `/goal resume`.

import { expect, test } from "bun:test";
import {
  change,
  statusText,
} from "../../../src/plugins/claudetto/slices/goal/domain/command.ts";
import { nextTurn } from "../../../src/plugins/claudetto/slices/goal/domain/loop.ts";
import {
  createGoal,
  type Goal,
} from "../../../src/plugins/claudetto/slices/goal/domain/state.ts";

const CHECKS = [{ kind: "run", command: "false" } as const];
const FAIL = [{ pass: false, output: "x", at: 0 }];
const goal = (over: Partial<Goal> = {}, percent = 50): Goal => ({
  ...createGoal([{ title: "t", checks: CHECKS }], { budget: { percent } }),
  ...over,
});
const resumed = (percents: Record<string, number>): Goal =>
  change(goal({ paused: true }), "resume", "", 1, 0, percents).goal as Goal;
const spend = (percents: Record<string, number>) => ({ usd: 0, percents });

test("`resume` takes the percent of each limit as the bases of the budget", () => {
  const out = change(goal({ paused: true }), "resume", "", 1, 0, {
    five_hour: 60,
    seven_day: 10,
  });
  expect(out.goal?.basePercents).toEqual({ five_hour: 60, seven_day: 10 });
  expect(out.start).toBe(true);
});

test("a resumed goal does not stop at once at the percent that stopped it", () => {
  const out = nextTurn(
    resumed({ five_hour: 60 }),
    FAIL,
    spend({ five_hour: 62 }),
    2,
  );
  expect(out.goal?.paused).toBe(false);
  expect(out.submit).toBeDefined();
});

test("a resumed goal stops when one limit grows by the budget", () => {
  const out = nextTurn(
    resumed({ five_hour: 60, seven_day: 5 }),
    FAIL,
    spend({ five_hour: 61, seven_day: 55 }),
    2,
  );
  expect(out.goal?.paused).toBe(true);
});

test("a goal made with empty bases takes the percent of the first turn as its base", () => {
  const first = nextTurn(
    goal({ basePercents: {} }, 10),
    FAIL,
    spend({ five_hour: 60 }),
    2,
  );
  expect(first.goal?.paused).toBe(false);
  expect(first.goal?.basePercents).toEqual({ five_hour: 60 });
  const later = nextTurn(first.goal as Goal, FAIL, spend({ five_hour: 70 }), 3);
  expect(later.goal?.paused).toBe(true);
});

test("a saved goal with no `basePercents` takes the percent of the first turn as its base", () => {
  const old = { ...goal({}, 10), basePercent: 80 } as Goal;
  delete (old as { basePercents?: unknown }).basePercents;
  const out = nextTurn(old, FAIL, spend({ five_hour: 60 }), 2);
  expect(out.goal?.paused).toBe(false);
  expect(out.goal?.basePercents).toEqual({ five_hour: 60 });
});

test("a limit with no base takes its percent as its base, and the others count", () => {
  const out = nextTurn(
    goal({ basePercents: { five_hour: 10 } }),
    FAIL,
    spend({ five_hour: 12, seven_day: 51 }),
    2,
  );
  expect(out.goal?.paused).toBe(false);
  expect(out.goal?.basePercents).toEqual({ five_hour: 10, seven_day: 51 });
  const grown = nextTurn(
    goal({ basePercents: { five_hour: 10 } }),
    FAIL,
    spend({ five_hour: 61 }),
    2,
  );
  expect(grown.goal?.paused).toBe(true);
});

test("a limit below its base means a new window and counts in full", () => {
  const out = nextTurn(
    goal({ basePercents: { five_hour: 80 } }),
    FAIL,
    spend({ five_hour: 10 }),
    2,
  );
  expect(out.goal?.paused).toBe(false);
});

test("a reset of the 5-hour window does not count the weekly percent as new growth", () => {
  const base = { five_hour: 90, seven_day: 40 };
  const out = nextTurn(
    goal({ basePercents: base }, 30),
    FAIL,
    spend({ five_hour: 0, seven_day: 40 }),
    2,
  );
  expect(out.goal?.paused).toBe(false);
});

test("a limit that resets and grows again counts its growth once, not twice", () => {
  const g = goal({ basePercents: { five_hour: 20 } }, 50);
  const low = nextTurn(g, FAIL, spend({ five_hour: 19 }), 2);
  expect(low.goal?.paused).toBe(false);
  expect(low.goal?.basePercents).toEqual({ five_hour: 0 });
  expect(statusText(g, spend({ five_hour: 19 }))).toContain("plan 19% of 50%");
  const high = nextTurn(low.goal as Goal, FAIL, spend({ five_hour: 50 }), 3);
  expect(high.goal?.paused).toBe(true);
});

test("the status shows the highest growth over the limits", () => {
  const g = goal({ basePercents: { five_hour: 10, seven_day: 5 } });
  const text = statusText(g, spend({ five_hour: 15, seven_day: 25 }));
  expect(text).toContain("plan 20% of 50%");
});
