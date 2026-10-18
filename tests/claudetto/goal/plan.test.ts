// The rules of the text of `/goal`: the flags, the steps of a condition, and the steps of a plan file.

import { expect, test } from "bun:test";
import { parseArgs } from "../../../src/plugins/claudetto/slices/goal/domain/command.ts";
import {
  conditionSteps,
  planSteps,
} from "../../../src/plugins/claudetto/slices/goal/domain/plan.ts";

test("the flags set the controls and leave the condition", () => {
  const parsed = parseArgs(
    "fix it --max-turns 5 --stall 2 --budget 40% --until 23:30",
    0,
  );
  expect(parsed.condition).toBe("fix it");
  expect(parsed.controls).toMatchObject({
    maxTurns: 5,
    stall: 2,
    budget: { percent: 40 },
  });
  expect(new Date(parsed.controls.until ?? 0).getHours()).toBe(23);
});

test("`--budget $2.5` is a cost in USD", () => {
  expect(parseArgs("x --budget $2.5", 0).controls.budget).toEqual({ usd: 2.5 });
});

test("a condition with commands in backticks is one step of `run` checks", () => {
  const [step] = conditionSteps(
    "`just check` exits 0 and `git status` is empty",
  );
  expect(step?.checks).toEqual([
    { kind: "run", command: "just check" },
    { kind: "run", command: "git status" },
  ]);
});

test("a condition with no command is one `judge` check", () => {
  expect(conditionSteps("it works")[0]?.checks).toEqual([
    { kind: "judge", claim: "it works" },
  ]);
});

test("the plan file `design-steps.md` of `trim-0-2-0` gives its numbered steps and their `Check:` lines", async () => {
  const text = await Bun.file(
    "openspec/changes/trim-0-2-0/design-steps.md",
  ).text();
  const steps = planSteps(text);
  expect(steps.length).toBeGreaterThanOrEqual(10);
  expect(steps[0]?.title).toBe("Commit the start state");
  expect(steps[0]?.checks).toEqual([
    { kind: "run", command: "git status --short" },
  ]);
  expect(steps.map((s) => s.title)).not.toContain(
    "Notes for the spec integration (a later change)",
  );
  expect(steps[2]?.checks[0]).toEqual({
    kind: "run",
    command: "just test tests/claudetto/guard && just lab",
  });
});
