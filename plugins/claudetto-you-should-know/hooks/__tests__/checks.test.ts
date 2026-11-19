import { expect, test } from "claude-code/testing";

import { type Box, offered, PLUGIN, PROPS, pause, MOUNT } from "./testkit";

type Kept = Map<string, unknown>;
type Row = { id: string; view?: { kind: string } };

const LINE = "Tests run in order.";
const fresh = (): Box => ({ text: "", filled: [], toasts: [], forks: 0 });
const view = (kept: Kept): string | undefined =>
	((kept.get("sessions") ?? []) as Row[]).find((r) => r.id === "s1")?.view?.kind;

const settle = async (): Promise<void> => {
	for (let i = 0; i < 10; i++) {
		await pause();
	}
};

const step = async ($: Parameters<typeof offered>[0], index: number): Promise<void> => {
	for await (const _chunk of $.turn.step({ turnId: "t2", index, model: "m", messageCount: 1 })) {
		// drained so the step completes
	}
	await settle();
};

test("a Heads up tag leads the row with the star, the tag and a middle dot", MOUNT, async ($, on) => {
	// Arrange
	const band = await offered($, on, fresh(), { replies: ["learn: Disk is nearly full.\ntag: Heads up"] });

	// Act
	const drawn = JSON.stringify(await band.drawn());

	// Assert
	expect(drawn).toContain("✦");
	expect(drawn).toContain("Heads up");
	expect(drawn).toContain(" · ");
	expect(drawn).not.toContain("You should know");
});

test("a check issues one fork that carries only a prompt", MOUNT, async ($, on) => {
	// Arrange
	const box = fresh();

	// Act
	await offered($, on, box);

	// Assert
	expect(box.forks).toBe(1);
	expect(Object.keys((box.args?.[0] ?? {}) as object)).toEqual(["prompt"]);
});

test("a row left in explaining by a dead process is cleared and the next check runs", MOUNT, async ($, on) => {
	// Arrange
	const box = fresh();
	const kept: Kept = new Map([["sessions", [{ id: "s1", view: { kind: "explaining", line: "old" } }]]]);

	// Act
	await offered($, on, box, { kept });

	// Assert
	expect(box.forks).toBe(1);
	expect(view(kept)).toBe("offer");
});

test("a second check does not start while one is in flight", MOUNT, async ($, on) => {
	// Arrange
	const box = fresh();
	let release: () => void = () => undefined;
	const hold = new Promise<void>((resolve) => {
		release = resolve;
	});
	await offered($, on, box, { hold, isOffer: false });

	// Act
	await step($, 12);
	const whileHeld = box.forks;
	release();
	await settle();

	// Assert
	expect(whileHeld).toBe(1);
});

test("the strip shows the note while a view is open and nothing once it is gone", MOUNT, async ($, on) => {
	// Arrange
	const band = await offered($, on, fresh());
	const open = await band.find({ key: "Learn more" });

	// Act
	await band.press({ key: "Knew this already" });
	await settle();

	// Assert
	expect(open).toBeDefined();
	expect(await band.find({ key: "Learn more" })).toBeUndefined();
});

test("a surface that detached no longer counts as drawing the band", MOUNT, async ($, on) => {
	// Arrange
	const box = fresh();
	const surfaces = ["desktop"];
	on("session.detach", (_$, e) => ({ ...e }) as never);
	const band = await offered($, on, box, { surface: "desktop", surfaces });
	await band.press({ key: "Knew this already" });
	await settle();
	surfaces.splice(0, surfaces.length, "vscode");

	// Act
	await $.session.detach({ surface: "desktop", clientId: "c1", reason: "detach" } as never);
	surfaces.splice(0, surfaces.length, "desktop");
	await step($, 12);

	// Assert
	expect(box.forks).toBe(1);
});

test("a surface that is still reported keeps drawing the band after a detach elsewhere", MOUNT, async ($, on) => {
	// Arrange
	const box = fresh();
	const surfaces = ["desktop"];
	on("session.detach", (_$, e) => ({ ...e }) as never);
	const band = await offered($, on, box, { surface: "desktop", surfaces, replies: [`learn: One.`, `learn: Two.`] });
	await band.press({ key: "Knew this already" });
	await settle();

	// Act
	await $.session.detach({ surface: "vscode", clientId: "c1", reason: "detach" } as never);
	await step($, 12);

	// Assert
	expect(box.forks).toBe(2);
});

test("with debug on, the last three checks draw as rows above the note and no more", MOUNT, async ($, on) => {
	// Arrange
	const checks = [1, 2, 3, 4, 5].map((n) => ({ number: n, step: 6, outcome: "none", latencyMs: 1500, at: 1_700_000_000_000 }));
	const kept: Kept = new Map([["sessions", [{ id: "s1", checked: 5, checks }]]]);

	// Act
	const band = await offered($, on, fresh(), { kept, env: { CLAUDE_CODE_YOU_SHOULD_KNOW_DEBUG: "1" } });
	await settle();
	const drawn = JSON.stringify(await band.drawn());

	// Assert
	expect(drawn).toContain("debug · check 6 · step 6 · shown");
	expect(drawn).toContain("debug · check 5 · step 6 · none · 1.5s");
	expect(drawn).toContain("debug · check 4");
	expect(drawn).not.toContain("debug · check 3");
	expect(drawn.match(/debug · check/g)).toHaveLength(3);
});

test("with debug off no check row draws", MOUNT, async ($, on) => {
	// Arrange
	const checks = [1, 2].map((n) => ({ number: n, step: 6, outcome: "none", latencyMs: 1500, at: 1_700_000_000_000 }));
	const kept: Kept = new Map([["sessions", [{ id: "s1", checked: 2, checks }]]]);

	// Act
	const band = await offered($, on, fresh(), { kept });

	// Assert
	expect(JSON.stringify(await band.drawn())).not.toContain("debug · check");
});

test("with debug on and a survey up, no check row draws", MOUNT, async ($, on) => {
	// Arrange
	const checks = [1, 2].map((n) => ({ number: n, step: 6, outcome: "none", latencyMs: 1500, at: 1_700_000_000_000 }));
	const kept: Kept = new Map([["sessions", [{ id: "s1", checked: 2, checks }]]]);
	await offered($, on, fresh(), { kept, env: { CLAUDE_CODE_YOU_SHOULD_KNOW_DEBUG: "1" } });
	const survey = await $.ui.mount({ plugin: PLUGIN, surface: "terminal", component: "AbovePrompt", props: { ...PROPS, hasSurvey: true } });

	// Act
	const drawn = JSON.stringify(await survey.drawn());

	// Assert
	expect(drawn).not.toContain("debug · check");
});

test("three ignored offers skip the next eligible check, and the skip is used up", MOUNT, async ($, on) => {
	// Arrange
	const box = fresh();
	const kept: Kept = new Map<string, unknown>([["looksToSkip", 1]]);

	// Act
	await offered($, on, box, { kept, isOffer: false });

	// Assert
	expect(box.forks).toBe(0);
	expect(kept.get("looksToSkip")).toBe(0);
});

test("an answer resets both backoff counters", MOUNT, async ($, on) => {
	// Arrange
	const kept: Kept = new Map<string, unknown>([["typedPastInARow", 4]]);
	const band = await offered($, on, fresh(), { kept });

	// Act
	await band.press({ key: "Knew this already" });
	await settle();

	// Assert
	expect(kept.get("typedPastInARow")).toBe(0);
	expect(kept.get("looksToSkip")).toBe(0);
});

test("a proposed line equal to a seen line ignoring case and one full stop is not shown", MOUNT, async ($, on) => {
	// Arrange
	const box = fresh();
	const kept: Kept = new Map<string, unknown>([["seen", [LINE.toUpperCase().slice(0, -1)]]]);

	// Act
	await offered($, on, box, { kept, isOffer: false });

	// Assert
	expect(box.forks).toBe(1);
	expect(view(kept)).toBeUndefined();
});

test("a proposed line equal to a known line is not shown", MOUNT, async ($, on) => {
	// Arrange
	const box = fresh();
	const kept: Kept = new Map<string, unknown>([["known", [LINE.toLowerCase()]]]);

	// Act
	await offered($, on, box, { kept, isOffer: false });

	// Assert
	expect(box.forks).toBe(1);
	expect(view(kept)).toBeUndefined();
});

test("a shown line is kept as seen so it is not offered again", MOUNT, async ($, on) => {
	// Arrange
	const kept: Kept = new Map();

	// Act
	await offered($, on, fresh(), { kept });

	// Assert
	expect(kept.get("seen")).toEqual([LINE]);
});
