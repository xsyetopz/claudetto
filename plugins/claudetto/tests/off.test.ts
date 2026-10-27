// Lab tests of the `off` hook of the `prompt` slice: `prompt.attachment`.
// The hook under test sits above the stub of the engine, so the stub answers `next(e)`.

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

const attach = ($: Engine, on: On, type: string) => {
	on("prompt.attachment", () => ({ text: "engine text" }));
	return $.prompt.attachment({
		type,
		text: "engine text",
		origin: { kind: "engine" },
	});
};

test("`prompt.attachment` leaves out an attachment of an `off` kind", async ($: Engine, on: On) => {
	expect((await attach($, on, "tool_hosts_notice")).text).toBeNull();
});

test("`prompt.attachment` keeps an attachment of another kind", async ($: Engine, on: On) => {
	expect((await attach($, on, "auto_mode")).text).toBe("engine text");
});

const ENGINE_PLAN = `Plan mode is active. ${"x".repeat(2000)}
You should create your plan at /home/u/.claude/plans/a-b.md using the Write tool.
## Plan Workflow
### Phase 1: Initial Understanding
Launch up to 3 Explore agents IN PARALLEL.
### Phase 5: Call ExitPlanMode`;

test("`prompt.attachment` gives the plan mode text a shorter text with the plan file and `claudetto:Artemis`", async ($: Engine, on: On) => {
	on("prompt.attachment", () => ({ text: ENGINE_PLAN }));
	const { text } = await $.prompt.attachment({
		type: "plan_mode",
		text: ENGINE_PLAN,
		origin: { kind: "engine" },
	});
	expect(text).toContain("/home/u/.claude/plans/a-b.md");
	expect(text).toContain("`claudetto:Artemis`");
	expect(text).not.toContain("ExitPlanMode");
	expect(text?.length).toBeLessThan(ENGINE_PLAN.length);
});
