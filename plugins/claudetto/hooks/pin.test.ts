import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import { added, check, lab, RESULT_ROW, RO, submit } from "./pin.mock.ts";
import { PIN_NO_QUESTIONS } from "./texts-handoff.ts";

test("a constraint found on one prompt rides the next prompt as context, and the first prompt is not held for it", async ($: Engine, on: On) => {
	lab(on, RO);
	const awaited = await submit($);
	expect(added(awaited)).toEqual([]);
	await check($, "Read", { file_path: "/p/a.ts" });
	const awaited2 = await submit($);
	expect(awaited2.context?.join("\n")).toContain(
		"Nothing should change on disk.",
	);
});

test("a resumed session's first prompt waits for the constraint its earlier messages hold", async ($: Engine, on: On) => {
	const seen: string[] = [];
	lab(
		on,
		RO,
		[{ role: "user", text: "Nothing should change on disk.", toolUses: [] }],
		seen,
	);
	const awaited3 = await submit($);
	expect(awaited3.context?.join("\n")).toContain(
		"Nothing should change on disk.",
	);
});

test("the classifier sees the request that ends a long pasted message", async ($: Engine, on: On) => {
	const seen: string[] = [];
	lab(on, [], [], seen);
	await submit($, `${"Log line from a build. ".repeat(40)}Rename the file.`);
	await check($, "Read", { file_path: "/p/a.ts" });
	expect(seen.join("\n")).toContain("Rename the file.");
});

test("no constraint adds no context", async ($: Engine, on: On) => {
	lab(on, []);
	const awaited4 = await submit($);
	expect(added(awaited4)).toEqual([]);
});

test("read-only denies Edit, Write and writing Bash and lets reads through", async ($: Engine, on: On) => {
	lab(on, RO);
	await submit($);
	const awaited5 = await check($, "Edit", { file_path: "/p/a.ts" });
	expect(awaited5.decision).toBe("deny");
	const awaited6 = await check($, "Write", { file_path: "/p/a.ts" });
	expect(awaited6.decision).toBe("deny");
	const awaited7 = await check($, "Bash", { command: "echo 1 > src/a.ts" });
	expect(awaited7.decision).toBe("deny");
	const awaited8 = await check($, "Bash", {
		command: "sed -i '' s/a/b/ src/a.ts",
	});
	expect(awaited8.decision).toBe("deny");
	const awaited9 = await check($, "Bash", { command: "git commit -am x" });
	expect(awaited9.decision).toBe("deny");
	const awaited10 = await check($, "Bash", {
		command: "bun test 2>&1 | tail -5",
	});
	expect(awaited10.decision).not.toBe("deny");
	const awaited11 = await check($, "Read", { file_path: "/p/a.ts" });
	expect(awaited11.decision).not.toBe("deny");
});

test("no-commit denies git commit only", async ($: Engine, on: On) => {
	lab(on, [
		{ text: "Do not commit.", rule: "no-commit", quote: "do not commit" },
	]);
	await submit($, "Fix it, but do not commit.");
	const awaited12 = await check($, "Bash", { command: "git commit -m x" });
	expect(awaited12.decision).toBe("deny");
	const awaited13 = await check($, "Edit", { file_path: "/p/a.ts" });
	expect(awaited13.decision).not.toBe("deny");
});

test("only-files denies an edit of another file", async ($: Engine, on: On) => {
	lab(on, [
		{
			text: "Only touch src/config.ts.",
			rule: "only-files",
			files: ["src/config.ts"],
			quote: "Only touch src/config.ts.",
		},
	]);
	await submit($, "Only touch src/config.ts.");
	const awaited14 = await check($, "Edit", { file_path: "/p/src/config.ts" });
	expect(awaited14.decision).not.toBe("deny");
	const awaited15 = await check($, "Edit", { file_path: "/p/src/total.ts" });
	expect(awaited15.decision).toBe("deny");
});

test("the prior messages reach the extractor even when a message has no toolResults field", async ($: Engine, on: On) => {
	const seen: string[] = [];
	lab(
		on,
		RO,
		[
			{ role: "user", text: "Nothing should change on disk.", toolUses: [] },
			{ role: "assistant", text: "OK.", toolUses: [] },
			RESULT_ROW,
		],
		seen,
	);
	await submit($);
	expect(seen.join("\n")).toContain("1. Nothing should change on disk.");
});

test("each entry rides the note with the person's words that set it", async ($: Engine, on: On) => {
	lab(on, [{ ...RO[0], quote: "nothing should change  on disk" }]);
	await submit($);
	await check($, "Read", { file_path: "/p/a.ts" });
	const awaited16 = await submit($);
	expect(awaited16.context?.join("\n")).toContain(
		'Nothing should change on disk. (the user: "nothing should change  on disk")',
	);
});

for (const [name, quote] of [
	["no quote", undefined],
	["a quote only the agent's reply holds", "leave package.json alone"],
] as const) {
	test(`Agent Text Read as a Constraint: an entry with ${name} is dropped`, async ($: Engine, on: On) => {
		lab(
			on,
			[{ text: "Leave alone package.json.", rule: "none", quote }],
			[
				{
					role: "assistant",
					text: "I will leave package.json alone.",
					toolUses: [],
				},
			],
		);
		await submit($, "Commit the rest.");
		await check($, "Read", { file_path: "/p/a.ts" });
		const awaited17 = await submit($, "Go on.");
		expect(added(awaited17)).toEqual([]);
	});
}

test("no-questions denies both ask tools, before delegation answers them, and nothing else", async ($: Engine, on: On) => {
	lab(on, [
		{
			text: "Stop asking questions.",
			rule: "no-questions",
			quote: "stop asking questions",
		},
	]);
	await submit($, "stop asking questions. fix the problems");
	const asks = await Promise.all([
		$.tool.call({
			tool: "mcp__claudetto__ask-user-question",
			question: "Which?",
			options: ["Alpha", "Beta"],
		}),
		$.tool.call({
			tool: "AskUserQuestion",
			questions: [
				{
					question: "Which?",
					header: "Pick",
					options: [
						{ label: "Alpha", description: "a" },
						{ label: "Beta", description: "b" },
					],
					multiSelect: false,
				},
			],
		}),
	]);
	expect(asks[0]?.deny).toBe(PIN_NO_QUESTIONS("Stop asking questions."));
	expect(asks[1]?.deny).toBe(PIN_NO_QUESTIONS("Stop asking questions."));
	const awaited18 = await check($, "Edit", { file_path: "/p/a.ts" });
	expect(awaited18.decision).not.toBe("deny");
});
