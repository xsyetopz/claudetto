import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import { PIN_COMPACT_KEEP, PIN_NO_QUESTIONS } from "../../texts-pin.ts";
import {
	added,
	check,
	lab,
	RESULT_ROW,
	RO,
	spoken,
	submit,
} from "./pin.mock.ts";

const listen = (on: On): (() => string | undefined) => {
	let told: string | undefined;
	on("session.compact", (_$, e) => {
		told = e.instructions;
		return { skip: "seen" };
	});
	return () => told;
};

const compact = ($: Engine): Promise<unknown> =>
	$.session.compact({
		trigger: "manual",
		messages: [{ role: "user", text: "go", toolUses: [] }],
	});

test("a compaction is told to keep the person's corrections, refusals, and consents word for word", async ($: Engine, on: On) => {
	lab(on, {});
	const told = listen(on);
	await compact($);
	expect(told()).toBe(PIN_COMPACT_KEEP);
});

test("a compaction names each stored constraint after the standing instruction", async ($: Engine, on: On) => {
	lab(on, RO);
	const told = listen(on);
	await submit($);
	await check($, "Read", { file_path: "/p/a.ts" });
	await compact($);
	expect(told()).toContain(PIN_COMPACT_KEEP);
	expect(told()).toContain("- Nothing should change on disk.");
});

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
	lab(on, {}, [], seen);
	await submit($, `${"Log line from a build. ".repeat(40)}Rename the file.`);
	await check($, "Read", { file_path: "/p/a.ts" });
	expect(seen.join("\n")).toContain("Rename the file.");
});

test("no constraint adds no context", async ($: Engine, on: On) => {
	lab(on, {});
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
		command: "set -o pipefail; bun test 2>&1 | tail -5",
	});
	expect(awaited10.decision).not.toBe("deny");
	const awaited11 = await check($, "Read", { file_path: "/p/a.ts" });
	expect(awaited11.decision).not.toBe("deny");
});

test("no-commit denies git commit only", async ($: Engine, on: On) => {
	lab(on, { "Fix it, but do not commit.": "no-commit" });
	await submit($, "Fix it, but do not commit.");
	const awaited12 = await check($, "Bash", { command: "git commit -m x" });
	expect(awaited12.decision).toBe("deny");
	const awaited13 = await check($, "Edit", { file_path: "/p/a.ts" });
	expect(awaited13.decision).not.toBe("deny");
});

test("only-files denies an edit of another file", async ($: Engine, on: On) => {
	lab(on, { "Only touch src/config.ts.": "only-files" });
	await submit($, "Only touch src/config.ts.");
	const awaited14 = await check($, "Edit", { file_path: "/p/src/config.ts" });
	expect(awaited14.decision).not.toBe("deny");
	const awaited15 = await check($, "Edit", { file_path: "/p/src/total.ts" });
	expect(awaited15.decision).toBe("deny");
});

test("the prior messages reach the ledger's model even when a message has no toolResults field", async ($: Engine, on: On) => {
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

for (const [scenario, row] of [
	[
		"Agent Text Read as a Constraint",
		spoken("I will leave package.json alone."),
	],
	[
		"A Tool Result That Reads as a Limit",
		{ ...RESULT_ROW, text: "Do not edit the lockfile." },
	],
] as const) {
	test(`${scenario}: the ledger is not asked about the text, so it sets no entry`, async ($: Engine, on: On) => {
		const seen: string[] = [];
		lab(on, { [row.text]: "read-only" }, [row], seen);
		await submit($, "Commit the rest.");
		await check($, "Read", { file_path: "/p/a.ts" });
		const awaited17 = await submit($, "Go on.");
		expect(seen.join("\n")).not.toContain(row.text);
		expect(added(awaited17)).toEqual([]);
	});
}

test("a prompt sent before the read of the one before it settles keeps both prompts' limits", async ($: Engine, on: On) => {
	const first = Promise.withResolvers<boolean>();
	lab(
		on,
		{ "Do not push.": "no-push", "Do not commit.": "no-commit" },
		[],
		[],
		{ "Do not push.": first.promise },
	);
	await submit($, "Do not push.");
	await submit($, "Do not commit.");
	first.resolve(true);
	const push = await check($, "Bash", { command: "git push" });
	const commit = await check($, "Bash", { command: "git commit -m x" });
	expect([push.decision, commit.decision]).toEqual(["deny", "deny"]);
});

test("no-questions denies AskUserQuestion and nothing else", async ($: Engine, on: On) => {
	const message = "stop asking questions. fix the problems";
	lab(on, { [message]: "no-questions" });
	await submit($, message);
	const ask = await $.tool.call({
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
	});
	expect(ask.deny).toBe(PIN_NO_QUESTIONS(message));
	const awaited18 = await check($, "Edit", { file_path: "/p/a.ts" });
	expect(awaited18.decision).not.toBe("deny");
});
