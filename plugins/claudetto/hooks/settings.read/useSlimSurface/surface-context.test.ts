import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import { INTERVIEW_TEXT, planModeText } from "../../texts";

const ENGINE = { kind: "engine" } as const;
const LONG_REMINDER = "stock plan mode text ".repeat(300);

const planAttachment = async (
	$: Engine,
	on: On,
	text: string,
	detail?: { reminder: "full" | "sparse"; hasPlan: boolean },
) => {
	on("prompt.attachment", (_$, e) => ({ text: e.text }));
	const out = await $.prompt.attachment({
		type: "plan_mode",
		text,
		origin: ENGINE,
		...(detail === undefined
			? {}
			: { detail: { ...detail, planFilePath: "/plans/a.md" } }),
	});
	return out.text;
};

test("the full plan mode reminder is replaced by a shorter one naming the plan file", async ($: Engine, on: On) => {
	const text = await planAttachment($, on, LONG_REMINDER, {
		reminder: "full",
		hasPlan: false,
	});

	expect(text).toBe(planModeText("/plans/a.md", false));
	expect(text?.length).toBeLessThan(LONG_REMINDER.length);
});

test("a plan file that already holds a plan is read before it is edited", async ($: Engine, on: On) => {
	const text = await planAttachment($, on, LONG_REMINDER, {
		reminder: "full",
		hasPlan: true,
	});

	expect(text).toBe(planModeText("/plans/a.md", true));
});

test("the sparse reminder is kept", async ($: Engine, on: On) => {
	const text = await planAttachment($, on, LONG_REMINDER, {
		reminder: "sparse",
		hasPlan: false,
	});

	expect(text).toBe(LONG_REMINDER);
});

test("an engine plan mode text shorter than ours is kept", async ($: Engine, on: On) => {
	const text = await planAttachment($, on, "Plan.", {
		reminder: "full",
		hasPlan: false,
	});

	expect(text).toBe("Plan.");
});

test("a plan mode row without its facts is kept", async ($: Engine, on: On) => {
	const text = await planAttachment($, on, LONG_REMINDER);

	expect(text).toBe(LONG_REMINDER);
});

test("another attachment is passed on unchanged", async ($: Engine, on: On) => {
	on("prompt.attachment", (_$, e) => ({ text: e.text }));

	const out = await $.prompt.attachment({
		type: "skill_listing",
		text: LONG_REMINDER,
		origin: ENGINE,
	});

	expect(out.text).toBe(LONG_REMINDER);
});

const skillText = async ($: Engine, on: On, skill: string, source: string) => {
	on("skill.prompt", (_$, e) => e);
	const out = await $.skill.prompt({
		skill,
		text: "stock text",
		source: source === "built-in" ? "built-in" : "user",
	});
	return out.text;
};

test("the built-in init skill reaches the model as the interview", async ($: Engine, on: On) => {
	expect(await skillText($, on, "init", "built-in")).toBe(INTERVIEW_TEXT);
});

test("a user's own skill named init keeps its text", async ($: Engine, on: On) => {
	expect(await skillText($, on, "init", "user")).toBe("stock text");
});

test("another built-in skill keeps its text", async ($: Engine, on: On) => {
	expect(await skillText($, on, "review", "built-in")).toBe("stock text");
});
