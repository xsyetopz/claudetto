import type { On, PromptAttachmentInput } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

const ENGINE_TEXT = `Plan mode is active. ${"x".repeat(4900)}`;

const row = (
	text: string,
	reminder: "full" | "sparse",
	hasPlan = false,
): PromptAttachmentInput => ({
	type: "plan_mode",
	text,
	origin: { kind: "engine" },
	detail: { reminder, planFilePath: "/tmp/plans/quiet-fox.md", hasPlan },
});

test("the full plan mode reminder is replaced by a shorter one naming the plan file", async ($: Engine, on: On) => {
	on("prompt.attachment", (_$, e) => e);

	const out = await $.prompt.attachment(row(ENGINE_TEXT, "full"));

	expect(out.text).toContain("/tmp/plans/quiet-fox.md");
	expect(out.text).toContain("`claudetto:Artemis`");
	expect(out.text).toContain("`ExitPlanMode`");
	expect(out.text).not.toContain("already holds a plan");
	expect((out.text ?? "").length).toBeLessThan(ENGINE_TEXT.length);
});

test("a plan file that already holds a plan is read before it is edited", async ($: Engine, on: On) => {
	on("prompt.attachment", (_$, e) => e);

	const out = await $.prompt.attachment(row(ENGINE_TEXT, "full", true));

	expect(out.text).toContain("already holds a plan");
});

test("the sparse reminder is kept", async ($: Engine, on: On) => {
	on("prompt.attachment", (_$, e) => e);

	const out = await $.prompt.attachment(row(ENGINE_TEXT, "sparse"));

	expect(out.text).toBe(ENGINE_TEXT);
});

test("an engine text shorter than ours is kept", async ($: Engine, on: On) => {
	on("prompt.attachment", (_$, e) => e);

	const out = await $.prompt.attachment(row("Plan mode is active.", "full"));

	expect(out.text).toBe("Plan mode is active.");
});

test("a row without its facts is kept", async ($: Engine, on: On) => {
	on("prompt.attachment", (_$, e) => e);

	const out = await $.prompt.attachment({
		type: "plan_mode",
		text: ENGINE_TEXT,
		origin: { kind: "engine" },
	});

	expect(out.text).toBe(ENGINE_TEXT);
});

test("another attachment is passed on unchanged", async ($: Engine, on: On) => {
	on("prompt.attachment", (_$, e) => e);

	const out = await $.prompt.attachment({
		type: "plan_mode_exit",
		text: ENGINE_TEXT,
		origin: { kind: "engine" },
		detail: { planFilePath: "/tmp/plans/quiet-fox.md", hasPlan: true },
	});

	expect(out.text).toBe(ENGINE_TEXT);
});
