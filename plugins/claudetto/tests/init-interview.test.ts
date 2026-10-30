import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { INTERVIEW_TEXT } from "../src/blocks/init-interview/block.ts";

const BUILT_IN_INIT =
	"Please analyze this codebase and create a CLAUDE.md file";

const expanded = (on: On): void => {
	on("skill.prompt", (_$, e) => ({ text: e.text }));
};

test("the built-in `init` skill reaches the model as the interview", async ($: Engine, on: On) => {
	expanded(on);

	const out = await $.skill.prompt({
		skill: "init",
		text: BUILT_IN_INIT,
		source: "built-in",
	});

	expect(out.text).toBe(INTERVIEW_TEXT);
});

test("a user's own skill named `init` keeps its text", async ($: Engine, on: On) => {
	expanded(on);

	const out = await $.skill.prompt({
		skill: "init",
		text: "Own words.",
		source: "userSettings",
	});

	expect(out.text).toBe("Own words.");
});

test("another built-in skill keeps its text", async ($: Engine, on: On) => {
	expanded(on);

	const out = await $.skill.prompt({
		skill: "review",
		text: "Review it.",
		source: "built-in",
	});

	expect(out.text).toBe("Review it.");
});
