import { expect, test } from "bun:test";
import { ARMS, type Arm, WINDOW, verdict } from "./arms.ts";
import { type Event, eventsOf } from "./events.ts";
import { rec } from "./testing.ts";

const arm = (name: string): Arm => {
	const found = ARMS.find((a) => a.name === name);
	if (found === undefined) {
		throw new Error(`no arm ${name}`);
	}
	return found;
};

const ev = (type: Event["type"], tokens: number): Event => ({
	type,
	n: 1,
	index: 0,
	tokens,
});

test("a handoff call is a clear, a fork is a handover, a summarizer is a compaction", () => {
	const events = eventsOf([
		rec(1, { calledHandoff: true }),
		rec(2, {}),
		rec(3, { kind: "summarizer", contextTokens: 140_000 }),
		rec(4, { kind: "fork", contextTokens: 100_000 }),
	]);
	expect(events.map((e) => [e.type, e.tokens])).toEqual([
		["clear", 50_000],
		["compaction", 140_000],
		["handover", 100_000],
	]);
});

test("B at 50% fires when the context first reaches half the window", () => {
	expect(verdict(arm("B50"), [ev("handover", WINDOW / 2 + 5_000)])).toBe("ok");
	expect(verdict(arm("B50"), [ev("handover", WINDOW / 2 - 5_000)])).toContain(
		"before",
	);
	expect(verdict(arm("B50"), [])).toContain("no handover");
});

test("C needs a compaction near 140,000 tokens and no handover", () => {
	expect(verdict(arm("C"), [ev("compaction", 145_000)])).toBe("ok");
	expect(verdict(arm("C"), [ev("compaction", 80_000)])).toContain("near");
	expect(verdict(arm("C"), [ev("handover", 145_000)])).toContain("no compaction");
});

test("D is two compactions then one handover, in that order", () => {
	expect(
		verdict(arm("D"), [
			ev("compaction", 70_000),
			ev("compaction", 70_000),
			ev("handover", 100_000),
		]),
	).toBe("ok");
	expect(
		verdict(arm("D"), [ev("compaction", 70_000), ev("handover", 100_000)]),
	).toContain("expected");
});

test("A needs a clear after a handoff call at each boundary and nothing else", () => {
	const three = [ev("clear", 70_000), ev("clear", 70_000), ev("clear", 70_000)];
	expect(verdict(arm("A"), three)).toBe("ok");
	expect(verdict(arm("A"), [...three, ev("compaction", 1)])).toContain("expected");
});
