// The built-in agents are off (task 3.10 of change `release-0-3-0-alpha-2`, design D21): the snippet turns them off, and plan mode names `claudetto:Scout`.

import { expect, test } from "bun:test";
import { onAttachment } from "../../../plugins/claudetto/slices/prompt/adapters/mod.ts";
import { SCOUT_AGENT } from "../../../plugins/claudetto/slices/prompt/domain/plan-mode.ts";
import { SNIPPET } from "../../../plugins/claudetto/snippets.ts";
import DEFAULTS from "./fixtures/text-defaults-2.1.309.json";

/** The plan mode text of Claude Code 2.1.309, with the plan file path of a session. */
const PLAN_TEXT = (DEFAULTS as Record<string, { text: string }>)[
  "plan-mode"
]?.text.replace(
  "<config-dir>/plans/<plan-name>.md",
  "/home/u/.claude/plans/a-b.md",
) as string;

const run = onAttachment as never as (...a: unknown[]) => Promise<{
  text: string | null;
}>;

test("the snippet sets `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS=1` and denies `general-purpose`", () => {
  expect(SNIPPET.env.CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS).toBe("1");
  expect(SNIPPET.permissions.deny).toContain("Agent(general-purpose)");
});

test("the plan mode attachment names `claudetto:Scout`, the plan file, and no `Explore`, `Plan`, or `ExitPlanMode`", async () => {
  const stub = (async () => ({ text: PLAN_TEXT })) as never;
  const { text } = await run({}, { type: "plan_mode", text: PLAN_TEXT }, stub);
  expect(text).toContain(`\`${SCOUT_AGENT}\``);
  expect(text).toContain("/home/u/.claude/plans/a-b.md");
  expect(text).toContain("`AskUserQuestion`");
  expect(text).not.toMatch(/\bExplore\b|ExitPlanMode|Plan agent/);
  expect(text?.length).toBeLessThan(PLAN_TEXT.length);
});

test.each([
  ["a path with a space", "/Users/John Doe/.claude/plans/a.md"],
  ["a `plansDirectory` without `plans/`", "docs/design/x.md"],
])("the plan mode attachment keeps %s", async (_, path) => {
  const engine = PLAN_TEXT.replace("/home/u/.claude/plans/a-b.md", path);
  const stub = (async () => ({ text: engine })) as never;
  const { text } = await run({}, { type: "plan_mode", text: engine }, stub);
  expect(text).toContain(`Plan file: ${path}.`);
});

test("an existing plan file gives the edit step", async () => {
  const engine = PLAN_TEXT.replace(
    "No plan file exists yet. You should create your plan at /home/u/.claude/plans/a-b.md using the Write tool.",
    "A plan file already exists at /home/u/.claude/plans/a-b.md. You can read it and make incremental edits using the Edit tool.",
  );
  const stub = (async () => ({ text: engine })) as never;
  const { text } = await run({}, { type: "plan_mode", text: engine }, stub);
  expect(text).toContain(
    "Plan file: /home/u/.claude/plans/a-b.md, which already holds a plan.",
  );
});

test("a plan mode text that is shorter than ours stays", async () => {
  const short = "Plan mode still active.";
  const stub = (async () => ({ text: short })) as never;
  expect(await run({}, { type: "plan_mode", text: short }, stub)).toStrictEqual(
    { text: short },
  );
});

test("an attachment of an `off` kind is still left out", async () => {
  const stub = (async () => ({ text: "x" })) as never;
  expect(await run({}, { type: "goal_status", text: "x" }, stub)).toStrictEqual(
    { text: null },
  );
});
