import type { Engine } from "claude-code/testing";
import { expect, test } from "claude-code/testing";

import { type Box, offered, pause } from "./testkit";

const fresh = (): Box => ({ text: "", filled: [], toasts: [], forks: 0 });
const OFF_TEXT = "/plugin disable claudetto-you-should-know";

type Row = { id: string; view?: { kind: string } };
type Kept = Map<string, unknown>;

const view = (kept: Kept): string | undefined =>
	((kept.get("sessions") ?? []) as Row[]).find((r) => r.id === "s1")?.view?.kind;

const settle = async (): Promise<void> => {
	for (let i = 0; i < 10; i++) {
		await pause();
	}
};

/** Presses Disable twice so the off view is up and the command sits in the prompt box. */
const armed = async ($: Engine, on: Parameters<typeof offered>[1], box: Box, kept: Kept) => {
	const band = await offered($, on, box, { kept });
	await band.press({ key: "Disable" });
	await pause();
	await band.press({ key: "Press again to disable" });
	for (let i = 0; i < 50 && box.filled.length === 0; i++) {
		await pause();
	}
	await settle();
	return band;
};

test("turning off fills the command and shows the off view", async ($, on) => {
	// Arrange
	const box = fresh();
	const kept: Kept = new Map();

	// Act
	await armed($, on, box, kept);

	// Assert
	expect(box.filled).toEqual([OFF_TEXT]);
	expect(view(kept)).toBe("off");
});

test("a typed disable takes the off view down", async ($, on) => {
	// Arrange
	const box = fresh();
	const kept: Kept = new Map();
	await armed($, on, box, kept);

	// Act
	await $.prompt.submit({ text: OFF_TEXT, origin: { kind: "composer" }, wait: false } as never);
	await settle();

	// Assert
	expect(view(kept)).toBeUndefined();
});

test("the next ordinary prompt takes an unconfirmed off view down too", async ($, on) => {
	// Arrange
	const box = fresh();
	const kept: Kept = new Map();
	await armed($, on, box, kept);

	// Act
	await $.prompt.submit({ text: "something else", origin: { kind: "composer" }, wait: false } as never);
	await settle();

	// Assert
	expect(view(kept)).toBeUndefined();
});

test("a plugin command typed by the person takes the off view down", async ($, on) => {
	// Arrange
	on("command.run", () => ({}) as never);
	const box = fresh();
	const kept: Kept = new Map();
	await armed($, on, box, kept);

	// Act
	await $.command.run({ command: "plugin", args: "disable claudetto-you-should-know", origin: { kind: "composer" } } as never);
	await settle();

	// Assert
	expect(view(kept)).toBeUndefined();
});

test("ending the session clears an open offer", async ($, on) => {
	// Arrange
	on("session.end", (_$, e) => ({ sessionId: e.sessionId }));
	const kept: Kept = new Map();
	await offered($, on, fresh(), { kept });
	const before = view(kept);

	// Act
	await $.session.end({ sessionId: "s1", reason: "other" } as never);

	// Assert
	expect(before).toBe("offer");
	expect(view(kept)).toBeUndefined();
});

test("ending the session clears an off view", async ($, on) => {
	// Arrange
	on("session.end", (_$, e) => ({ sessionId: e.sessionId }));
	const kept: Kept = new Map();
	await armed($, on, fresh(), kept);

	// Act
	await $.session.end({ sessionId: "s1", reason: "other" } as never);

	// Assert
	expect(view(kept)).toBeUndefined();
});
