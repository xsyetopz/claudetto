// The texts of `goal` use the singular for one step.

import { expect, test } from "bun:test";
import { nextTurn } from "../../../src/plugins/claudetto/slices/goal/domain/loop.ts";
import { createGoal } from "../../../src/plugins/claudetto/slices/goal/domain/state.ts";

const SPEND = { usd: 0, percents: {} };

test("the done text of a goal with one step says `1 step`", () => {
  const goal = createGoal(
    [{ title: "build", checks: [{ kind: "run", command: "just check" }] }],
    {},
  );
  const out = nextTurn(goal, [{ pass: true, output: "", at: 0 }], SPEND, 0);
  expect(out.say).toContain("1 step ");
  expect(out.say).not.toContain("1 steps");
});

test("the done text of a goal with two steps says `2 steps`", () => {
  const step = { title: "s", checks: [{ kind: "run", command: "x" }] } as const;
  const goal = { ...createGoal([step, step], {}), step: 1 };
  const out = nextTurn(goal, [{ pass: true, output: "", at: 0 }], SPEND, 0);
  expect(out.say).toContain("2 steps");
});
