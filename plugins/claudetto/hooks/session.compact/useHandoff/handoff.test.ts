import type { On } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

import { HANDOFF_OPENING } from "../../texts";

const HANDOFF = "/tmp/claude-501/-proj/s-1/handoff.md";

const dir = (name: string) => ({
	name,
	kind: "dir" as const,
	size: 0,
	mtimeMs: 0,
	isLink: false,
});

const ok = {
	exitCode: 0,
	stdout: "",
	stderr: "",
	isStdoutTruncated: false,
	isStderrTruncated: false,
};

/** `file` is the handoff text, or undefined while the model has not written it; the rest records what the hooks did. */
const lab = (on: On, file: { text?: string }, rejects = false) => {
	const notes: string[] = [];
	const removed: (readonly string[])[] = [];
	const logs: string[] = [];
	const seen = { notes, removed, core: 0, logs };
	mock.env(on, {});
	on("session.id", () => ({ value: "s-1" }));
	on("session.measure", (_$, e) => ({ changed: e.changed }));
	on("turn.complete", (_$, e) => ({ text: e.answer }));
	on("fs.list", (_$, e) => {
		const tree: Record<string, string[]> = {
			"/tmp": ["claude-501"],
			"/tmp/claude-501": ["-proj"],
			"/tmp/claude-501/-proj": ["s-1"],
		};
		const names = tree[e.path];
		return names === undefined
			? { deny: `ENOENT: ${e.path}` }
			: { value: names.map((name) => dir(name)) };
	});
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
	on("session.append", (_$, e) => {
		const block = e.message.content[0];
		seen.notes.push(String(block?.["text"]));
		return { message: e.message, uuid: "u-1" };
	});
	on("session.compact", (_$, e) => {
		if (rejects) {
			throw new Error("not available in a headless session");
		}
		seen.core += 1;
		return { messages: e.messages };
	});
	on("ui.log", (_$, e) => {
		seen.logs.push(e.text);
		return { value: undefined };
	});
	return seen;
};

const MANUAL = { trigger: "manual", messages: [] } as const;

const measure = ($: Engine, percent: number) =>
	$.session.measure({
		context: { window: 1_000_000, percent },
		rateLimits: [],
		changed: ["context"],
	});

const complete = ($: Engine) =>
	$.turn.complete({
		answer: "done",
		durationMs: 1,
		isAborted: false,
		turnId: "t-1",
		reason: "answer",
	});

test("past the soft threshold one notice names the handoff file, and a second measure adds none", async ($: Engine, on: On) => {
	const seen = lab(on, {});
	await measure($, 59);
	await measure($, 61);
	await measure($, 70);
	expect(seen.notes).toHaveLength(1);
	expect(seen.notes[0]).toContain(HANDOFF);
});

test("a turn that ends with the handoff file written compacts, and the hook answers with the file as the one message and removes it", async ($: Engine, on: On) => {
	const file = { text: "goal: ship" };
	const seen = lab(on, file);
	await measure($, 61);
	await complete($);
	expect(seen.core).toBe(1);
	const answer = await $.session.compact(MANUAL);
	expect(answer).toEqual({
		messages: [
			{ role: "user", text: HANDOFF_OPENING("goal: ship"), toolUses: [] },
		],
	});
	expect(seen.removed.at(-1)).toEqual(["rm", HANDOFF]);
});

test("a turn that ends before the file exists compacts nothing", async ($: Engine, on: On) => {
	const seen = lab(on, {});
	await measure($, 61);
	await complete($);
	expect(seen.core).toBe(0);
	expect(seen.removed).toEqual([]);
});

test("a /compact with no handoff file takes the built-in path", async ($: Engine, on: On) => {
	const seen = lab(on, {});
	await $.session.compact(MANUAL);
	expect(seen.core).toBe(1);
});

test("a rejected compaction call is logged and the turn still ends", async ($: Engine, on: On) => {
	const seen = lab(on, { text: "goal: ship" }, true);
	await measure($, 61);
	const out = await complete($);
	expect(out).toEqual({ text: "done" });
	expect(seen.logs.some((line) => line.includes("headless"))).toBe(true);
});
