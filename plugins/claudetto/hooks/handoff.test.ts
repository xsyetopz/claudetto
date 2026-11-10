import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import {
	asked,
	between,
	compactWith,
	firstText,
	human,
	KEY,
	lab,
	longSession,
	said,
	use,
	world,
} from "./handoff.mock.ts";
import { readMessages } from "./handoff/transcript.ts";

test("an instruction older than the last twelve turns stays in the handoff", async ($: Engine, on: On) => {
	const files = lab(
		on,
		[
			human("The staged deletions are mine; never restore them."),
			human("go"),
		].join("\n"),
	);

	await compactWith($, longSession());

	const text = firstText(files);
	expect(
		between(text, "## Standing Instructions", "## Decisions Log"),
	).toContain("The staged deletions are mine");
	expect(text.split("## Current State")[1]).not.toContain("staged deletions");
});

test("Fallback File: the code-built handoff's git line carries the write time", async ($: Engine, on: On) => {
	const files = lab(
		on,
		human("go"),
		"## main...origin/main [ahead 3]\n M a.ts\n",
	);

	await compactWith($, longSession());

	const text = firstText(files);
	const at = /from the transcript at (\S+),/u.exec(text)?.[1];
	expect(at).toBeDefined();
	expect(text.split("## Current State")[1]).toContain(
		`Git as of ${at}: \`## main...origin/main [ahead 3]\``,
	);
	expect(text).not.toContain("M a.ts");
});

test("a session with no human statement writes no invented text under the two sections", async ($: Engine, on: On) => {
	const files = lab(on, "");

	await compactWith($, [said("user", "hi"), said("assistant", "hello")]);

	const text = firstText(files);
	expect(
		between(text, "## Standing Instructions", "## Decisions Log").trim(),
	).toBe("None found in the transcript.");
	expect(between(text, "## Decisions Log", "## Current State").trim()).toBe(
		"None found in the transcript.",
	);
});

test("a key in a statement is redacted in the handoff", async ($: Engine, on: On) => {
	const files = lab(on, human(`use ${KEY} for the eval`));

	await compactWith($, [said("user", "hi")]);

	expect(files[0]?.text).not.toContain(KEY);
});

test("a subagent's compaction writes no handoff", async ($: Engine, on: On) => {
	const files = lab(on, human("go"));

	await $.session.compact({
		trigger: "auto",
		agentId: "a1",
		messages: [said("user", "hi")],
	});

	expect(files).toEqual([]);
});

test("the handoff names the files the session touched, and a call with no path adds none", async ($: Engine, on: On) => {
	const seen = world(on);

	await compactWith($, [
		said("user", "edit it"),
		{
			role: "assistant",
			text: "done",
			toolUses: [
				use("Edit", { file_path: "src/a.ts" }),
				use("Bash", { command: "ls" }),
			],
		},
	]);

	expect(firstText(seen.writes)).toContain("- `src/a.ts`");
});

test("the handoff carries the user's ask", async ($: Engine, on: On) => {
	const seen = world(on);

	await compactWith($, asked("make the gate quiet"));

	expect(seen.writes[0]?.text).toContain("> make the gate quiet");
});

test("a session that worked from a plan gets its path and not its text", async ($: Engine, on: On) => {
	const seen = world(on);

	await compactWith($, [
		said("user", "Work from the plan."),
		{
			role: "assistant",
			text: "Reading the plan.",
			toolUses: [use("Read", { file_path: "docs/plans/rename.md" })],
		},
		{
			role: "user",
			text: "",
			toolUses: [],
			toolResults: [
				{
					tool_use_id: "u-Read",
					text: "Step 1: rename. Step 2: delete the shim.",
					isError: false,
				},
			],
		},
	]);

	const text = firstText(seen.writes);
	expect(text).toContain("docs/plans/rename.md");
	expect(text).not.toContain("delete the shim");
});

test("a tool call with no file path adds no path", () => {
	const { paths } = readMessages([
		said("user", "Run the tests."),
		{
			role: "assistant",
			text: "",
			toolUses: [use("Bash", { command: "just check" })],
		},
	]);

	expect(paths).toEqual([]);
});
