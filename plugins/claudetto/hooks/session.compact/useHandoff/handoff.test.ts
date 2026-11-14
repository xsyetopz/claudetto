import type { On } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

import { HANDOFF_OPENING, HANDOFF_SKIP } from "../../texts";

const HANDOFF = "/tmp/claudetto-handoff-s-1.md";

const ok = {
	exitCode: 0,
	stdout: "",
	stderr: "",
	isStdoutTruncated: false,
	isStderrTruncated: false,
};

/** `file` is the handoff text, or undefined while the model has not written it; the rest records what the hooks did. */
const lab = (on: On, file: { text?: string }) => {
	const notes: string[] = [];
	const removed: (readonly string[])[] = [];
	const seen = { notes, removed, core: 0 };
	mock.env(on, {});
	on("session.id", () => ({ value: "s-1" }));
	on("fs.read", (_$, e) =>
		e.path === HANDOFF && file.text !== undefined
			? { value: file.text }
			: { deny: `ENOENT: ${e.path}` },
	);
	on("process.run", (_$, e) => {
		seen.removed.push(e.argv);
		delete file.text;
		return { value: ok };
	});
	on("session.append", (_$, e, next) => {
		const block = e.message.content[0];
		seen.notes.push(String(block?.["text"]));
		return next(e);
	});
	on("session.compact", (_$, e) => {
		seen.core += 1;
		return { messages: e.messages };
	});
	return seen;
};

const compact = (
	$: Engine,
	trigger: "auto" | "manual" | "precompute",
	agent: { agentId?: string } = {},
) =>
	$.session.compact({
		trigger,
		messages: [{ role: "user", text: "older work", toolUses: [] }],
		...agent,
	});

test("the first auto-compaction with no handoff file is skipped, and one notice names the file", async ($: Engine, on: On) => {
	const seen = lab(on, {});
	const answer = await compact($, "auto");
	expect(answer.skip).toBe(HANDOFF_SKIP);
	expect(seen.core).toBe(0);
	expect(seen.notes).toHaveLength(1);
	expect(seen.notes[0]).toContain(HANDOFF);
});

test("an auto-compaction after the notice with still no file takes the built-in path", async ($: Engine, on: On) => {
	const seen = lab(on, {});
	await compact($, "auto");
	await compact($, "auto");
	expect(seen.core).toBe(1);
	expect(seen.notes).toHaveLength(1);
});

test("a compaction that finds the handoff file answers with it as the one message and removes it", async ($: Engine, on: On) => {
	const file: { text?: string } = {};
	const seen = lab(on, file);
	await compact($, "auto");
	file.text = "goal: ship";
	const answer = await compact($, "auto");
	expect(answer).toEqual({
		messages: [
			{ role: "user", text: HANDOFF_OPENING("goal: ship"), toolUses: [] },
		],
	});
	expect(seen.removed).toEqual([["rm", HANDOFF]]);
	expect(seen.core).toBe(0);
});

test("a precompute leaves the handoff file for the compaction that installs", async ($: Engine, on: On) => {
	const seen = lab(on, { text: "goal: ship" });
	const answer = await compact($, "precompute");
	expect(answer.skip).toBe(HANDOFF_SKIP);
	expect(seen.removed).toEqual([]);
});

test("a /compact with no handoff file takes the built-in path", async ($: Engine, on: On) => {
	const seen = lab(on, {});
	await compact($, "manual");
	expect(seen.core).toBe(1);
	expect(seen.notes).toEqual([]);
});

test("a subagent's compaction takes the built-in path though the file exists", async ($: Engine, on: On) => {
	const seen = lab(on, { text: "goal: ship" });
	await compact($, "auto", { agentId: "a-1" });
	expect(seen.core).toBe(1);
	expect(seen.removed).toEqual([]);
});
