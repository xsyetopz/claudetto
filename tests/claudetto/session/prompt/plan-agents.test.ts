// The built-in agents are off (task 3.10 of change `release-0-3-0-alpha-2`, design D21): the snippet turns them off, and plan mode names `claudetto:Artemis`.

import { expect, test } from "bun:test";
import { onAttachment } from "../../../../plugins/claudetto/modules/session/prompt/adapters/mod.ts";
import { SCOUT_AGENT } from "../../../../plugins/claudetto/modules/session/prompt/domain/plan-mode.ts";
import { SNIPPET } from "../../../../plugins/claudetto/modules/setup/prompts.ts";
import DEFAULTS from "./fixtures/text-defaults-2.1.311.json";

const PATTERN_1 = /\bExplore\b|ExitPlanMode|Plan agent/;

/** The plan mode text of Claude Code 2.1.311, with the plan file path of a session. */
const defaults: Record<string, { text: string }> = DEFAULTS;
const PLAN_TEXT = (defaults["plan-mode"]?.text ?? "").replace(
	"<config-dir>/plans/<plan-name>.md",
	"/home/u/.claude/plans/a-b.md",
);

/** The attachment handler with a stub for the engine that answers `text`. */
const run = (
	e: { type: string; text: string },
	answer: string,
): Promise<{ text: string | null }> =>
	onAttachment({}, e, async () => ({ text: answer }));

test("the snippet sets `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS=1` and denies `general-purpose`", () => {
	expect(SNIPPET.env.CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS).toBe("1");
	expect(SNIPPET.permissions.deny).toContain("Agent(general-purpose)");
});

test("the plan mode attachment names `claudetto:Artemis`, the plan file, and no `Explore`, `Plan`, or `ExitPlanMode`", async () => {
	const { text } = await run({ type: "plan_mode", text: PLAN_TEXT }, PLAN_TEXT);
	expect(text).toContain(`\`${SCOUT_AGENT}\``);
	expect(text).toContain("/home/u/.claude/plans/a-b.md");
	expect(text).toContain("`AskUserQuestion`");
	expect(text).not.toMatch(PATTERN_1);
	expect(text?.length).toBeLessThan(PLAN_TEXT.length);
});

test.each([
	["a path with a space", "/Users/John Doe/.claude/plans/a.md"],
	["a `plansDirectory` without `plans/`", "docs/design/x.md"],
])("the plan mode attachment keeps %s", async (_, path) => {
	const engine = PLAN_TEXT.replace("/home/u/.claude/plans/a-b.md", path);
	const { text } = await run({ type: "plan_mode", text: engine }, engine);
	expect(text).toContain(path);
});

test("an existing plan file gives another text than a new plan file, with the same path", async () => {
	const file = "/home/u/.claude/plans/a-b.md";
	const existing = PLAN_TEXT.replace(
		`No plan file exists yet. You should create your plan at ${file} using the Write tool.`,
		`A plan file already exists at ${file}. You can read it and make incremental edits using the Edit tool.`,
	);
	const fresh = await run({ type: "plan_mode", text: PLAN_TEXT }, PLAN_TEXT);
	const { text } = await run({ type: "plan_mode", text: existing }, existing);
	expect(text).toContain(file);
	expect(text).not.toBe(fresh.text);
});

test("a plan mode text that is shorter than ours stays", async () => {
	const short = "Plan mode still active.";
	expect(await run({ type: "plan_mode", text: short }, short)).toStrictEqual({
		text: short,
	});
});

test("an attachment of an `off` kind is still left out", async () => {
	expect(await run({ type: "goal_status", text: "x" }, "x")).toStrictEqual({
		text: null,
	});
});
