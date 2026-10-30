import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import {
	CONTEXT_BLOCK,
	HANDOFF_DIR,
	HANDOFF_SECTIONS,
} from "../../src/blocks/handoff/handoff.ts";

const BLOCKS = [
	{
		name: "claudeMd",
		text: `# Project
Use bun.
`,
	},
	{ name: "userEmail", text: "someone@example.com" },
	{ name: "currentDate", text: "2026-10-29" },
];

const REMINDER = "<system-reminder>Plan mode is on.</system-reminder>";

const contextOf = async ($: Engine, on: On) => {
	on("prompt.context", (_$, e) => e);
	return await $.prompt.context({ blocks: BLOCKS });
};

test("the handoff block is the only one added to the first user message", async ($: Engine, on: On) => {
	const out = await contextOf($, on);

	expect(out.blocks.map((block) => block.name).join(",")).toBe(
		`claudeMd,userEmail,currentDate,${CONTEXT_BLOCK}`,
	);
});

test("no block the harness built is changed", async ($: Engine, on: On) => {
	const out = await contextOf($, on);

	expect(out.blocks.slice(0, BLOCKS.length)).toEqual(BLOCKS);
});

test("the handoff block names the folder and the nine headings", async ($: Engine, on: On) => {
	const out = await contextOf($, on);

	const text =
		out.blocks.find((block) => block.name === CONTEXT_BLOCK)?.text ?? "";
	expect(
		[HANDOFF_DIR, ...HANDOFF_SECTIONS].filter((named) => !text.includes(named)),
	).toEqual([]);
});

test("the handoff block costs no request", async ($: Engine, on: On) => {
	const asked: string[] = [];
	on("model.complete", (_$, e) => {
		asked.push(e.model);
		return { deny: "the handoff block may not cost a request" };
	});

	await contextOf($, on);

	expect(asked).toEqual([]);
});

test("no text is added to a message the harness injects", async ($: Engine, on: On) => {
	on("prompt.attachment", (_$, e) => e);

	const out = await $.prompt.attachment({
		type: "plan_mode",
		text: REMINDER,
		origin: { kind: "engine" },
		detail: {
			reminder: "sparse",
			planFilePath: "/tmp/plan.md",
			hasPlan: false,
		},
	});

	expect(out.text).toBe(REMINDER);
});
