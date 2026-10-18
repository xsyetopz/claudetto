// The state of a goal: create, update, and read it, with a check of each kind.

import { expect, test } from "bun:test";
import {
  type Check,
  createGoal,
  goalText,
  parseGoal,
} from "../../../src/plugins/claudetto/slices/goal/domain/state.ts";
import { STALL_DEFAULT } from "../../../src/plugins/claudetto/slices/goal/limits.ts";

const CHECKS: Check[] = [
  { kind: "run", command: "just check" },
  { kind: "file", path: "OUT.md", text: "done" },
  { kind: "judge", claim: "The docs name the new flag." },
];

const GOAL = createGoal([{ title: "build", checks: CHECKS }], { maxTurns: 5 });

test("a new goal starts at step 0 with the default `stall`", () => {
  expect(GOAL).toMatchObject({ step: 0, turns: 0, paused: false, log: [] });
  expect(GOAL.stall).toBe(STALL_DEFAULT);
  expect(GOAL.maxTurns).toBe(5);
});

test("a goal with a check of each kind survives a write and a read", async () => {
  const path = `${"/tmp"}/claudetto-goal-${Date.now()}.json`;
  const moved = {
    ...GOAL,
    paused: true,
    log: [{ at: 1, note: "skip 1 to 2" }],
  };
  await Bun.write(path, goalText(moved));
  expect(parseGoal(await Bun.file(path).text())).toEqual(moved);
});

test("the text `null`, an empty text, and a text that is not a goal read as no goal", () => {
  for (const text of ["null", "", "{", '{"steps":1}']) {
    expect(parseGoal(text)).toBeNull();
  }
  expect(goalText(null)).toBe("null");
});
