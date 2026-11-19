import type { Engine } from "claude-code/testing";
import { expect, test } from "claude-code/testing";

import { type Box, offered, pause } from "./testkit";

type Kept = Map<string, unknown>;
type Row = { id: string; view?: { kind: string } };

const LINE = "Tests run in order.";
const ON = { CLAUDE_CODE_YOU_SHOULD_KNOW_AUTO_SEND: "1" };
const fresh = (): Box => ({ text: "", filled: [], toasts: [], forks: 0 });
const view = (kept: Kept): string | undefined =>
	((kept.get("sessions") ?? []) as Row[]).find((r) => r.id === "s1")?.view?.kind;

const settle = async (): Promise<void> => {
	for (let i = 0; i < 10; i++) {
		await pause();
	}
};

/**
 * Waits `ms` of real time: the plugin counts idle time on its own clock, which a test cannot move.
 * It reads the wall clock, because a 5 ms timer fires late and 200 of them took 2308 ms on 2.1.327.
 */
const later = async (ms: number, fn: () => Promise<void>): Promise<void> => {
	const end = Date.now() + ms;
	while (Date.now() < end) {
		await pause();
	}
	await fn();
};

/** Each idle-clock test waits 2.2 s of real time after an offer that takes about 2 s to set up, close to the kit's 5 s default. */
const IDLE = { timeoutMs: 15_000 };

const send = async ($: Engine, text: string, kind = "composer"): Promise<void> => {
	await $.prompt.submit({ text, origin: { kind }, wait: false } as never);
	await settle();
};

const withNote = (box: Box) => box.sent?.filter((s) => Array.isArray(s.context) && s.context.length > 0) ?? [];

test("an offer idle for two seconds sends its note with the typed message and clears as known", IDLE, async ($, on) => {
	// Arrange
	const box = fresh();
	const kept: Kept = new Map();
	await offered($, on, box, { kept, env: ON });

	// Act
	await later(2200, () => send($, "hello there"));

	// Assert
	expect(withNote(box)).toHaveLength(1);
	expect(JSON.stringify(withNote(box)[0]?.context)).toContain(LINE);
	expect(box.logs).toEqual(["Sent a note to Claude with your prompt"]);
	expect(kept.get("known")).toEqual([LINE]);
	expect(view(kept)).toBeUndefined();
});

test("an offer idle for less than two seconds sends no note", IDLE, async ($, on) => {
	// Arrange
	const box = fresh();
	await offered($, on, box, { env: ON });

	// Act
	await later(1000, () => send($, "hello there"));

	// Assert
	expect(withNote(box)).toHaveLength(0);
});

test("with the switch off no note is sent", IDLE, async ($, on) => {
	// Arrange
	const box = fresh();
	await offered($, on, box);

	// Act
	await later(2200, () => send($, "hello there"));

	// Assert
	expect(withNote(box)).toHaveLength(0);
});

test("a session driven by another program sends no note", IDLE, async ($, on) => {
	// Arrange
	const box = fresh();
	await offered($, on, box, { env: { ...ON, CLAUDE_CODE_SESSION_KIND: "bg" } });

	// Act
	await later(2200, () => send($, "hello there"));

	// Assert
	expect(withNote(box)).toHaveLength(0);
});

test("a lone digit counts as a button press and blocks the note for that offer", IDLE, async ($, on) => {
	// Arrange
	const box = fresh();
	await offered($, on, box, { env: ON });

	// Act
	await later(2200, async () => {
		await send($, "1");
		await send($, "hello there");
	});

	// Assert
	expect(withNote(box)).toHaveLength(0);
});

test("a message from the bridge sends no note", IDLE, async ($, on) => {
	// Arrange
	const box = fresh();
	await offered($, on, box, { env: ON });

	// Act
	await later(2200, () => send($, "hello there", "bridge"));

	// Assert
	expect(withNote(box)).toHaveLength(0);
});

test("the note goes once for one offer", IDLE, async ($, on) => {
	// Arrange
	const box = fresh();
	await offered($, on, box, { env: ON });

	// Act
	await later(2200, async () => {
		await send($, "first");
		await send($, "second");
	});

	// Assert
	expect(withNote(box)).toHaveLength(1);
});

test("an offer pressed away by a button sends no note", IDLE, async ($, on) => {
	// Arrange
	const box = fresh();
	const band = await offered($, on, box, { env: ON });
	await band.press({ key: "Learn more" });
	await settle();

	// Act
	await later(2200, () => send($, "hello there"));

	// Assert
	expect(withNote(box)).toHaveLength(0);
});

test("a narrow terminal that cannot hold the five-label row starts no idle clock", IDLE, async ($, on) => {
	// Arrange
	const box = fresh();
	const props = { hasSurvey: false, isCollapsed: false, isWorking: false, maxRows: 1, bodyColumns: 100, scroll: { offset: 0, bodyRows: 20 }, view: {} };
	await offered($, on, box, { env: ON, props });

	// Act
	await later(2200, () => send($, "hello there"));

	// Assert
	expect(withNote(box)).toHaveLength(0);
});

for (const [name, patch] of [
	["a collapsed band", { isCollapsed: true }],
	["a survey", { hasSurvey: true }],
	["a scrolled view", { scroll: { offset: 3, bodyRows: 20 } }],
] as const) {
	test(`${name} starts no idle clock`, IDLE, async ($, on) => {
		// Arrange
		const box = fresh();
		const props = { hasSurvey: false, isCollapsed: false, isWorking: false, maxRows: 20, bodyColumns: 100, scroll: { offset: 0, bodyRows: 20 }, view: {}, ...patch };
		await offered($, on, box, { env: ON, props, isOffer: !patch.hasSurvey && !patch.isCollapsed });

		// Act
		await later(2200, () => send($, "hello there"));

		// Assert
		expect(withNote(box)).toHaveLength(0);
	});
}

test("debug rows stop the idle clock", IDLE, async ($, on) => {
	// Arrange
	const box = fresh();
	const checks = [{ number: 1, step: 6, outcome: "none", latencyMs: 1500, at: 1_700_000_000_000 }];
	const kept: Kept = new Map([["sessions", [{ id: "s1", checked: 1, checks }]]]);
	await offered($, on, box, { kept, env: { ...ON, CLAUDE_CODE_YOU_SHOULD_KNOW_DEBUG: "1" } });

	// Act
	await later(2200, () => send($, "hello there"));

	// Assert
	expect(withNote(box)).toHaveLength(0);
});

test("an armed Disable stops the idle clock", IDLE, async ($, on) => {
	// Arrange
	const box = fresh();
	const band = await offered($, on, box, { env: ON });
	await band.press({ key: "Disable" });
	await settle();

	// Act
	await later(2200, () => send($, "hello there"));

	// Assert
	expect(withNote(box)).toHaveLength(0);
});

test("time while the model works does not count as idle", IDLE, async ($, on) => {
	// Arrange
	const box = fresh();
	const props = { hasSurvey: false, isCollapsed: false, isWorking: true, maxRows: 20, bodyColumns: 100, scroll: { offset: 0, bodyRows: 20 }, view: {} };
	await offered($, on, box, { env: ON, props });

	// Act
	await later(2200, () => send($, "hello there"));

	// Assert
	expect(withNote(box)).toHaveLength(0);
});

test("an explained card survives any number of prompts", async ($, on) => {
	// Arrange
	const kept: Kept = new Map();
	const band = await offered($, on, fresh(), { kept });
	await band.press({ key: "Learn more" });
	await settle();

	// Act
	for (const turn of ["t2", "t3", "t4"]) {
		await send($, "next thing");
		for await (const _chunk of $.turn.step({ turnId: turn, index: 0, model: "m", messageCount: 1 })) {
			// drained so the step completes
		}
		await settle();
	}

	// Assert
	expect(view(kept)).toBe("explained");
});

test("an offer cleared by the second typed prompt raises the ignored streak", async ($, on) => {
	// Arrange
	const kept: Kept = new Map();
	await offered($, on, fresh(), { kept });

	// Act
	for (const turn of ["t2", "t3"]) {
		await send($, "next thing");
		for await (const _chunk of $.turn.step({ turnId: turn, index: 0, model: "m", messageCount: 1 })) {
			// drained so the step completes
		}
		await settle();
	}

	// Assert
	expect(view(kept)).toBeUndefined();
	expect(kept.get("typedPastInARow")).toBe(1);
});

test("a prompt from the bridge counts toward clearing the offer", async ($, on) => {
	// Arrange
	const kept: Kept = new Map();
	await offered($, on, fresh(), { kept });

	// Act
	for (const turn of ["t2", "t3"]) {
		await send($, "next thing", "bridge");
		for await (const _chunk of $.turn.step({ turnId: turn, index: 0, model: "m", messageCount: 1 })) {
			// drained so the step completes
		}
		await settle();
	}

	// Assert
	expect(view(kept)).toBeUndefined();
});
