// The handoff probe (openspec change `eval-rebuild`, task 3.1): a seeded session plants one item for each kind and depth, `handoffText` is built with code, and an item survives when its exact token is in its section.

import { expect, test } from "bun:test";
import { compactNote } from "../../../dev/handoff-probe/main.ts";
import {
	messagesOf,
	replayDecisions,
	replayTicks,
} from "../../../dev/handoff-probe/replay.ts";
import {
	handoffOf,
	rates,
	scoreItems,
	sectionOf,
} from "../../../dev/handoff-probe/score.ts";
import {
	DEPTHS,
	KINDS,
	sessionOf,
} from "../../../dev/handoff-probe/session.ts";
import { handoffText } from "../../../plugins/claudetto/modules/session/handoff/handover.ts";

test("`sessionOf` plants the same session for the same seed", () => {
	const a = sessionOf(7, 30);
	const b = sessionOf(7, 30);
	const c = sessionOf(8, 30);

	expect(JSON.stringify(a)).toBe(JSON.stringify(b));
	expect(JSON.stringify(a.items)).not.toBe(JSON.stringify(c.items));
});

test("`sessionOf` plants one item for each kind and depth, with its token in the session", () => {
	const session = sessionOf(3, 100);
	const text =
		JSON.stringify(session.messages) +
		session.items.map((i) => i.tasks ?? "").join();

	expect(session.items).toHaveLength(KINDS.length * DEPTHS.length);
	for (const item of session.items) {
		for (const token of item.tokens) {
			expect(text).toContain(token.replaceAll("`", ""));
		}
	}
	expect(session.messages.length).toBe(200);
});

test("a small seeded session keeps all 15 items in the handoff", () => {
	const session = sessionOf(1, 30);

	const scored = scoreItems(session, handoffOf(session));

	expect(scored.filter((s) => !s.kept)).toEqual([]);
	expect(scored).toHaveLength(15);
});

test("an item with its token removed from its section is lost, even when the token is in another section", () => {
	const session = sessionOf(1, 30);
	const text = handoffOf(session);
	const token =
		session.items.find((i) => i.kind === "constraint")?.tokens[0] ?? "";

	const removed = scoreItems(session, text.replaceAll(token, "gone"));
	const moved = scoreItems(
		session,
		text
			.replaceAll(token, "gone")
			.replace("## Files\n", `## Files\n${token}\n`),
	);

	expect(removed.filter((s) => !s.kept).map((s) => s.item.kind)).toContain(
		"constraint",
	);
	expect(moved.filter((s) => !s.kept).map((s) => s.item.kind)).toContain(
		"constraint",
	);
});

test("`sectionOf` returns the body between a heading and the next one", () => {
	const text = "# Handoff\n\n## Goal\nA\n\n## Files\nB\nC\n\n## Checks\nD\n";

	expect(sectionOf(text, "## Files")).toBe("B\nC");
	expect(sectionOf(text, "## Next Step")).toBe("");
});

test("`rates` gives the survival share with a Wilson 95% interval", () => {
	const [row] = rates([true, true, true, false].map((kept) => ({ kept })));

	expect(row?.kept).toBe(3);
	expect(row?.n).toBe(4);
	expect(row?.low).toBeCloseTo(0.3006, 3);
	expect(row?.high).toBeCloseTo(0.9544, 3);
});

test("`handoffText` is the builder that the probe calls", () => {
	const session = sessionOf(2, 30);

	expect(handoffOf(session)).toBe(
		handoffText({
			messages: session.messages,
			name: "probe-change",
			tasks: session.tasks,
			checks: [],
			root: "",
		}),
	);
});

const row = (value: unknown) => JSON.stringify(value);

const transcript = (answer: string, ticked: boolean): string =>
	[
		row({
			type: "user",
			message: { role: "user", content: "Pick a store." },
		}),
		row({
			type: "assistant",
			message: {
				role: "assistant",
				content: [
					{
						type: "tool_use",
						id: "q1",
						name: "AskUserQuestion",
						input: {
							questions: [
								{
									question: "Which store?",
									options: [{ label: "sql" }, { label: "kv" }],
								},
							],
						},
					},
				],
			},
		}),
		row({
			type: "user",
			message: {
				role: "user",
				content: [
					{
						type: "tool_result",
						tool_use_id: "q1",
						content: `User has answered your questions: "Which store?"="${answer}". You can now continue.`,
					},
				],
			},
		}),
		...(ticked
			? [
					row({
						type: "assistant",
						message: {
							role: "assistant",
							content: [
								{
									type: "tool_use",
									id: "e1",
									name: "Edit",
									input: {
										file_path: "/nowhere/openspec/changes/c/tasks.md",
										old_string: "- [ ] 1.1 First",
										new_string: "- [x] 1.1 First",
									},
								},
							],
						},
					}),
				]
			: []),
		row({
			type: "assistant",
			isSidechain: true,
			message: { role: "assistant", content: "skip" },
		}),
	].join("\n");

test("`messagesOf` joins a tool result to its tool use and drops a sidechain row", () => {
	const messages = messagesOf(transcript("sql", false));

	expect(messages).toHaveLength(3);
	expect(messages[1]?.toolUses[0]?.text).toContain("Which store?");
});

test("`replayDecisions` scores the chosen answer of each `AskUserQuestion` in `## Decisions`", () => {
	const messages = messagesOf(transcript("sql", false));

	const found = replayDecisions(messages);

	expect(found).toEqual([{ kept: true, rank: 1 }]);
});

test("`replayTicks` rebuilds the next task from the tasks file and scores it in `## Next Step`", () => {
	const messages = messagesOf(transcript("sql", true));
	const tasks = "- [ ] 1.1 First\n- [ ] 1.2 Second\n- [ ] 1.3 Third\n";

	const found = replayTicks(messages, () => tasks);

	expect(found).toEqual([{ kept: true }]);
});

test("`--with-compact` names the paid command and the need for approval, and makes no call", () => {
	const note = compactNote();

	expect(note).toContain("just probe");
	expect(note).toContain("not implemented");
});
